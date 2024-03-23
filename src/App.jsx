import './styles.css';

import client from './client.js';

import { ApolloProvider } from '@apollo/client';

import Books from './BooksAppDemo3.jsx';
import { useState } from 'react';

export default function App() {
  const [_, setCount] = useState(0);

  return (
    <ApolloProvider client={client}>
      <div className="App">
        <Books forceReRender={() => setCount((count) => count + 1)} />
      </div>
    </ApolloProvider>
  );
}
