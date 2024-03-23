const tags = [
  {
    id: '1',
    value: 'Fantasy',
    __typename: 'Tag',
  },
  {
    id: '2',
    value: 'Science Fiction',
    __typename: 'Tag',
  },
];

const books = [
  {
    id: '1',
    name: "Harry Potter and the Philosopher's Stone",
    authorId: '1',
    tagId: '1',
    __typename: 'Book',
  },
  {
    id: '2',
    name: 'Jurassic Park',
    authorId: '2',
    tagId: '2',
    __typename: 'Book',
  },
  {
    id: '3',
    name: 'Harry Potter and the Chamber of Secrets',
    authorId: '3',
    tagId: '1',
    __typename: 'Book',
  },
];

const authors = [
  {
    id: '1',
    name: 'J.K. Rowling',
    email: 'jV5kW@example.com',
    __typename: 'Author',
  },
  {
    id: '2',
    name: 'Michael Crichton',
    email: 'michael.crichton@me.com',
    __typename: 'Author',
  },
  {
    id: '3',
    name: 'Douglas Adams',
    email: 'douglas.adams@me.com',
    __typename: 'Author',
  },
];

export { tags, books, authors };
