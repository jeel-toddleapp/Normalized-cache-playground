import { gql } from '@apollo/client';
import React from 'react';

import client from './client.js';

const booksQuery = gql`
  query getBooks {
    books {
      id
      name
      author {
        id
        name
        email
      }
    }
  }
`;

const booksWithVariablesQuery = gql`
  query getBooks($name: String!) {
    books(name: $name) {
      id
      name
      author {
        id
        name
        email
      }
    }
  }
`;

const booksData = {
  books: [
    {
      id: 1,
      name: 'Harry Potter',
      __typename: 'Book',
      author: {
        id: 1,
        name: 'J.K. Rowling',
        email: 'jk@yopmail.com',
        __typename: 'Author',
      },
    },
    {
      id: 2,
      name: 'The Lord of the Rings',
      __typename: 'Book',
      author: {
        id: 2,
        name: 'J.R.R. Tolkien',
        email: 'jrr@yopmail.com',
        __typename: 'Author',
      },
    },
  ],
};

const booksDataWithVariables = {
  books: [
    {
      id: 1,
      name: 'Harry Potter',
      __typename: 'Book',
      author: {
        id: 1,
        name: 'J.K. Rowling',
        email: 'jk@yopmail.com',
        __typename: 'Author',
      },
    },
  ],
};

const writeBooksData = () => {
  client.writeQuery({
    query: booksQuery,
    data: booksData,
  });
};

const writeBooksDataWithVariables = () => {
  client.writeQuery({
    query: booksWithVariablesQuery,
    variables: { name: 'Harry Potter' },
    data: booksDataWithVariables,
  });
};

const CachePlayGround = () => {
  return (
    <div>
      <button onClick={writeBooksData}>Write Data of First Query</button>
      <button onClick={writeBooksDataWithVariables}>
        Write Books of Second Query
      </button>
    </div>
  );
};

export default CachePlayGround;
