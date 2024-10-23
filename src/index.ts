import express from 'express';
import db from './db/db_connect';

const app = express();

db.$client.connect() // Access the pool via db.$client
  .then(client => {
    console.log('Database connection successful');
    client.release(); // Release the client back to the pool

    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  })
  .catch(error => {
    console.error('Database connection error:', error);
  });