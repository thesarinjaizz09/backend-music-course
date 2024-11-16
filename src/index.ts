import db from './db/db_connect';
import app from "./app";
import { Request, Response } from 'express';
import './services/vimeoPollingService';

const port = process.env.PORT || 4000;

db.$client.connect() // Access the pool via db.$client
  .then(client => {
    console.log('Database connection successful');
    client.release(); // Release the client back to the pool

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`)
    });
  })
  .catch(error => {
    console.error('Database connection error:', error);
  });

  app.get("/",(req: Request,res: Response)=>{
    res.json("Welcome to the API");
  });
