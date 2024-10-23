import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg'; 

// Create a new Pool instance using connection details
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, 
  }
});
// process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, { Use SSL in production }

const db = drizzle(pool);

export default db;
