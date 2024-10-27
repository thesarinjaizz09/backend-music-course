import db from './db/db_connect';
import app from "./app";
import { Request, Response } from 'express';


db.$client.connect() // Access the pool via db.$client
  .then(client => {
    console.log('Database connection successful');
    client.release(); // Release the client back to the pool

    app.listen(process.env.PORT, () => {
      console.log('Server running on port 8000');
    });
  })
  .catch(error => {
    console.error('Database connection error:', error);
  });

  app.get("/",(req: Request,res: Response)=>{
    res.json("Welcome to the API");
  });