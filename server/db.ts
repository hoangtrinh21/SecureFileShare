
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create connection pool
const pool = mysql.createPool(process.env.DATABASE_URL);

export { pool };
