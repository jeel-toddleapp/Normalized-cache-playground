import { ApolloClient, InMemoryCache } from '@apollo/client';

import { populateDynamicId } from './ApolloClientHelpers.js';

import link from './link.js';
import _ from 'lodash';
import update from 'immutability-helper';

class InMemoryCacheWrapper extends InMemoryCache {
  constructor(options) {
    super(options);
    this.shouldPopulateId = options.shouldPopulateId ?? false;
  }

  write(...options) {
    const { query, result, variables = {}, dataId } = _.first(options);

    /**
     * HACK: Since apollo client has stopped generating dynamic id for non-normalized data,
     * we are generating dynamic id for non-normalized data. DO NOT REMOVE THIS CODE
     */

    if (this.shouldPopulateId) {
      const updatedResult = populateDynamicId({
        data: result,
        operation: { query, variables, dataId },
      });

      const updatedOptions = update(options, {
        0: {
          result: {
            $set: updatedResult,
          },
        },
      });

      const response = super.write(...updatedOptions);
      return response;
    }

    return super.write(...options);
  }
}

const typePolicies = {
  Book: {
    fields: {
      additionalDetailsByBook: {
        merge(existing, incoming = [], { mergeObjects }) {
          if (!existing) {
            return incoming;
          }

          const data = incoming.map((item, index) =>
            mergeObjects(item, existing?.[index] ?? {}),
          );

          return data;
        },
      },
    },
  },
};

const client = new ApolloClient({
  cache: new InMemoryCacheWrapper({
    // typePolicies,
    shouldPopulateId: false,
  }),
  link,
});

export default client;
