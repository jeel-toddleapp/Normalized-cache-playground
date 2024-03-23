import _ from 'lodash';
import update from 'immutability-helper';

/**
 * ---------------------------------------------------------------
 * In this section, we are generating dynamic id for each object not having id and having __typename.
 * To generate dynamic id, we are using response returned from graphql server.
 * However, only response is not sufficient to generate dynamic id. We also need to consider variables on fields and fragments.
 * To get this information, we are using operation object which is passed by apollo client in link.
 *
 * From operation object, we are creating field tree which represents relationships between different fields.
 * Each node of the tree consists of field name, variables map and child nodes(subfields)
 *
 * To get more idea on operations object and corresponding field tree, please refer to below examples:
 * https://codesandbox.io/s/apollo-cache-new-playground-sxdh0v?file=/src/structureOfOperationObject1.js
 * https://codesandbox.io/s/apollo-cache-new-playground-sxdh0v?file=/src/structureOfOperationObject2.js
 *
 * ---------------------------------------------------------------
 */

/**
 * ---- Functions to create field tree from operation object ----
 */

/**
 * This function sorts variables of a field in alphabetical order to create consistent id for that field.
 */
const _sortVariables = (variables = {}) => {
  const keys = _.keys(variables).sort();

  const data = _.reduce(
    keys,
    (result, key) => {
      return { ...result, [key]: variables[key] };
    },
    {},
  );

  return data;
};

/**
 * This functions create variables of a field using schema declaration and variables passed in query. It takes two parameters:
 * 1. fieldArguments - arguments of a fields declared in query or mutation.
 * 2. queryVariables - variables passed to query or mutation.
 */
const _prepareFieldVariablesFromArguments = ({
  fieldArguments,
  queryVariables,
}) => {
  const fieldVariables = {};

  _.forEach(fieldArguments ?? [], (argument) => {
    /**
     * Each argument contains at least two properties:
     * 1. name - name of the argument defined in query or mutation.
     * 2. value - actual name of the argument which is passed to query or mutation.
     * Ex. If we have schema like below, then name of the argument is "id" and value of the argument is "organizationId".
     *  organization(id: $organizationId)
     */

    const argumentName = _.get(argument, 'name.value', '');

    const argumentValueKind = _.get(argument, 'value.kind', '');

    switch (argumentValueKind) {
      /**
       * This case is used when we pass all variables as single object.
       */
      case 'Variable': {
        const variableName = _.get(argument, 'value.name.value', '');
        const variableValue = queryVariables[variableName];

        let sortedVariableValue = variableValue;

        /**
         * If variable value is an object, then we need to sort it to create consistent id.
         */
        if (
          typeof variableValue === 'object' &&
          variableValue !== null &&
          !Array.isArray(variableValue)
        ) {
          sortedVariableValue = _sortVariables(variableValue);
        }

        fieldVariables[argumentName] = sortedVariableValue;

        break;
      }

      /**
       * This case is used when we pass individual properties as variables instead of a single object.
       */
      case 'ObjectValue': {
        const objectValueFields = _.get(argument, 'value.fields', []);

        const objectValue = _prepareFieldVariablesFromArguments({
          fieldArguments: objectValueFields,
          queryVariables,
        });

        fieldVariables[argumentName] = objectValue;

        break;
      }
      /**
       * This case is used when variables are hardcoded into query or mutation or for default values.
       */

      default: {
        const argumentValue = _.get(argument, 'value.value');

        fieldVariables[argumentName] = argumentValue;
      }
    }
  });

  return _sortVariables(fieldVariables);
};

/**
 * This function creates field tree from operation object. Main aim of the field tree is to store variables of each field.
 * It takes four parameters:
 * 1. definitions - definitions of the query or mutation. It represents information of all fragments and query(or mutation).
 * 2. selectionSet - selection set of the query or mutation. It represents all fields which are requested in query or mutation.
 * 3. parentNode - parent node of the field tree.
 * 4. queryVariables - variables passed to query or mutation.
 */
const _populateFieldTree = ({
  definitions,
  selectionSet,
  parentNode,
  queryVariables,
}) => {
  const { selections } = selectionSet;

  _.forEach(selections, (selection) => {
    const {
      kind,
      alias,
      arguments: fieldArguments,
      name,
      selectionSet,
      typeCondition,
    } = selection;

    const node = {
      kind,
    };

    switch (kind) {
      /**
       * This case is applicable for normal fields like id,name, organization etc.
       */
      case 'Field': {
        const fieldName = _.get(name, 'value');
        const aliasName = _.get(alias, 'value');

        //If we have done aliasing consider that name instead of actual name.
        const finalFieldName = aliasName ? aliasName : fieldName;
        node.field = finalFieldName;
        node.schemaFieldName = fieldName;
        node.aliasFieldName = aliasName;

        parentNode[finalFieldName] = node;

        const fieldVariables = _prepareFieldVariablesFromArguments({
          fieldArguments,
          queryVariables,
        });

        if (!_.isEmpty(fieldVariables)) {
          node.variablesMap = fieldVariables;
        }

        if (!_.isEmpty(selectionSet)) {
          _populateFieldTree({
            definitions,
            selectionSet,
            parentNode: node,
            queryVariables,
          });
        }

        break;
      }

      /**
       * This case is applicable when we have interface or union type.
       */
      case 'InlineFragment': {
        const typeName = _.get(typeCondition, 'name.value');
        node.field = typeName;
        parentNode[typeName] = node;
        if (!_.isEmpty(selectionSet)) {
          _populateFieldTree({
            definitions,
            selectionSet,
            parentNode: node,
            queryVariables,
          });
        }

        break;
      }

      /**
       * This case is applicable when we have used a fragment in query or mutation.
       */
      case 'FragmentSpread': {
        const fragmentName = _.get(name, 'value');
        const newDefinition = _.find(
          definitions,
          ({ name }) => name?.value == fragmentName,
        );

        const { selectionSet } = newDefinition;

        _populateFieldTree({
          definitions,
          selectionSet,
          parentNode,
          queryVariables,
        });
        break;
      }
    }
  });
};

const _createFieldTree = (operation) => {
  const { query, variables, dataId } = operation;
  const { definitions } = query;

  const queryDefinition = _.first(definitions);

  const { selectionSet } = queryDefinition;

  const treeRootNode = {};

  try {
    _populateFieldTree({
      definitions,
      selectionSet,
      parentNode: treeRootNode,
      queryVariables: variables,
    });
  } catch (e) {
    console.error(
      'Error while creating field tree for ',
      operation.operationName || dataId,
      e,
    );
  }

  return treeRootNode;
};

/**
 * ---- Functions to populate dynamic id ----
 */

const _isPrimitiveValue = (data) =>
  !(_.get(data, '__typename') || Array.isArray(data));

const _ROOT_ENTITY_TYPES = [
  'SchoolQuery',
  'DocumentationQuery',
  'PlanningQuery',
  'PlannerQuery',
  'PlatformQuery',
  'GlobalConstants',
  'OrganizationManagementQuery',
  'CommunityQuery',
  'CmsQuery',
  'TaskManagmentQuery',
  'IntegrationQuery',
  'ContentQuery',
  'AiQuery',
  'DocumentationMutations',
  'SchoolMutations',
  'PlatformMutations',
  'PlannerMutations',
  'OrganizationManagementMutations',
  'TaskManagementMutations',
  'CommunityMutations',
  'IntegrationMutation',
  'CmsMutations',
  'ContentMutations',
  'AiMutations',
];

/**
 * This function injects dynamic id into each non-normalized object.
 * It relies on data returned from server and fieldTree corresponding to the data
 */
const _populateDynamicId = ({ data, parenId, fieldTree }) => {
  if (_isPrimitiveValue(data)) {
    return data;
  }

  if (data && !fieldTree) {
    console.warn(
      `Fields for data (${JSON.stringify(
        data,
        null,
        ' ',
      )}) are not present in fragment/query definition. Please verify fragment/query definition and data.`,
    );
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((value, index) => {
      return _populateDynamicId({
        data: value,
        parenId: `${parenId}.${index}`,
        fieldTree,
      });
    });
  }

  if (typeof data === 'object' && data) {
    //For special non normalized types, we need to ignore default ids. Hence, hasIdProperty will always be false for them.
    const hasIdProperty = !!data.id;

    const updatedData = { ...data };
    if (!hasIdProperty) {
      updatedData._id = parenId;
    }

    const keys = Object.keys(updatedData);
    return keys.reduce((result, key) => {
      const fieldTypeName = updatedData['__typename'];

      //Here, first condition is for fields that belong inside an interface or union type.
      const fieldNode =
        _.get(fieldTree, [fieldTypeName, key]) || _.get(fieldTree, key, {});

      const variablesMap = _.get(fieldNode, 'variablesMap', {});

      /**
       * Due to aliasing, we might have different name for field in schema and query.
       * So, to generate id, we will use schema name.
       */
      const fieldName = _.get(fieldNode, 'schemaFieldName');

      let newParentId = hasIdProperty
        ? `${fieldTypeName}:${updatedData['id']}.${fieldName}`
        : `${parenId}.${fieldName}`;

      if (!_.isEmpty(variablesMap)) {
        newParentId = `${newParentId}(${JSON.stringify(variablesMap)})`;
      }

      return {
        ...result,
        [key]: _populateDynamicId({
          data: updatedData[key],
          parenId: newParentId,
          fieldTree: fieldNode,
        }),
      };
    }, {});
  }
};

/**
 * ---- Main functions to populate dynamic id ----
 */

export const populateDynamicId = ({ data, operation }) => {
  const { dataId } = operation;

  if (_.includes(['ROOT_QUERY', 'ROOT_MUTATION'], dataId)) {
    return _populateDynamicIdForQuery({
      data,
      operation,
    });
  }

  return _populateDynamicIdForFragment({ data, operation });
};

const _populateDynamicIdForQuery = ({ data, operation }) => {
  const keys = _.keys(data ?? {});

  /**
   * parentPropertyOfQueryData can be platform, planner, etc.(Top level query fields)
   */
  const parentPropertyOfQueryData = _.filter(
    keys,
    (key) => key !== '__typename',
  )[0];
  const queryData = data[parentPropertyOfQueryData];

  const { __typename } = queryData;

  const initialId =
    _.findIndex(_ROOT_ENTITY_TYPES, (type) => type === __typename) > -1
      ? __typename
      : `ROOT_QUERY_${parentPropertyOfQueryData}`;

  const fieldTree = _createFieldTree(operation);

  try {
    const updatedQueryData = _populateDynamicId({
      data: queryData,
      parenId: initialId,
      fieldTree: fieldTree[parentPropertyOfQueryData],
    });

    return update(data, {
      [parentPropertyOfQueryData]: {
        $set: updatedQueryData,
      },
    });
  } catch (e) {
    console.error(
      'Error while populating dynamic id for ',
      operation.operationName,
      e,
    );
    return data;
  }
};

const _populateDynamicIdForFragment = ({ data, operation }) => {
  const fieldTree = _createFieldTree(operation);

  try {
    return _populateDynamicId({
      data,
      parenId: operation.dataId,
      fieldTree,
    });
  } catch (e) {
    console.error(
      'Error while populating dynamic id for Object',
      operation.dataId,
      ' ',
      e,
    );
    return data;
  }
};

/**
 *  ---- Utility functions ----
 */

export const getQueryMissingDataStatus = ({
  client,
  query,
  variables,
  optimistic = false,
}) => {
  /**
   * For all possible options of diff function, please refer to below link:
   * https://github.dev/apollographql/apollo-client/blob/a8a9e11e917716538206eb7d5de21dbfd09630bd/src/cache/core/types/Cache.ts#L28
   */
  return client?.cache?.diff({
    query,
    variables,
    optimistic,
  });
};

export const getFragmentMissingDataStatus = ({
  client,
  fragment,
  fragmentName,
  id,
  optimistic = false,
  variables = {},
}) => {
  /**
   * This part converts a fragment into a query, for more details please refer to below link:
   * https://github.dev/apollographql/apollo-client/blob/a8a9e11e917716538206eb7d5de21dbfd09630bd/src/utilities/graphql/fragments.ts#L76
   */
  const query = update(fragment, {
    definitions: (definitions) => {
      return [
        {
          kind: 'OperationDefinition',
          operation: 'query',
          selectionSet: {
            kind: 'SelectionSet',
            selections: [
              {
                kind: 'FragmentSpread',
                name: { kind: 'Name', value: fragmentName },
              },
            ],
          },
        },
        ...definitions,
      ];
    },
  });

  return client?.cache?.diff({
    query,
    variables,
    id,
    optimistic,
  });
};
