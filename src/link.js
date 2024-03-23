/*** LINK ***/
import { graphql, print } from 'graphql';
import { ApolloLink, Observable } from '@apollo/client';
import { schema } from './server';

import _ from 'lodash';

function delay(wait) {
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const staticDataLink = new ApolloLink((operation) => {
  return new Observable(async (observer) => {
    const { query, operationName, variables } = operation;

    console.log('================= Request started ===================== ');
    console.log('Query:::', print(query));

    await delay(1000);
    try {
      const result = await graphql({
        schema,
        source: print(query),
        variableValues: variables,
        operationName,
      });

      console.log('Result:::', _.cloneDeep(result));
      console.log('================= Request completed ===================== ');

      observer.next(result);
      observer.complete();
    } catch (err) {
      observer.error(err);
    }
  });
});

export default staticDataLink;
