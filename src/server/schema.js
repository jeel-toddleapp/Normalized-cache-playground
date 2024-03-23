import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLList,
} from 'graphql';

import { books, authors } from './data';

import _ from 'lodash';

const AuthorType = new GraphQLObjectType({
  name: 'Author',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    email: { type: GraphQLString },
    books: {
      type: new GraphQLList(BookType),
      resolve: (author) => {
        return books.filter((book) => book.authorId === author.id);
      },
    },
  }),
});

const BookType = new GraphQLObjectType({
  name: 'Book',
  fields: () => ({
    id: {
      type: GraphQLID,
    },
    name: { type: GraphQLString },
    author: {
      type: AuthorType,
      resolve: (book) => {
        const author = authors.find((author) => author.id === book.authorId);

        if (!author) {
          return null;
        }

        return author;
      },
    },
  }),
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: (...params) => {
    return {
      books: {
        type: new GraphQLList(BookType),
        resolve: () => {
          return books;
        },
      },
      authors: {
        type: new GraphQLList(AuthorType),
        resolve: () => authors,
      },
    };
  },
});

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    updateBook: {
      type: BookType,
      args: {
        id: { type: GraphQLID },
        name: { type: GraphQLString },
      },
      resolve: (root, args) => {
        const book = books.find((book) => book.id === args.id);
        book.name = args.name || book.name;

        return book;
      },
    },
  },
});

var schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
});

export default schema;
