"use client"

import { useEffect, useState } from 'react';

const HomePage = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')  // This points to the FastAPI endpoint
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((error) => console.error(error));
  }, []);

  return (
    <div>
      <h1>Next.js with FastAPI</h1>
      <p>{message}</p>
    </div>
  );
};

export default HomePage;
