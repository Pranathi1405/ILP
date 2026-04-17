// /**
//  * AUTHORS:
//  * Database Configuration
//  * Uses mysql2 with connection pooling for production-grade performance.
//  * The pool reuses connections instead of creating a new one for every query.
//  */

// import mysql from 'mysql2/promise';
// import dotenv from 'dotenv';

// dotenv.config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,

//   ssl: {
//     rejectUnauthorized: false
//   },

//   connectionLimit: 10,
//   waitForConnections: true,
//   queueLimit: 0,
//   timezone: '+00:00',
// });
// /**
//  * Test the DB connection on startup.
//  * Logs a success or error message.
//  */
// export const testDatabaseConnection = async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log('✅ Database connected successfully');
//     connection.release(); // Always release back to pool
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//     process.exit(1); // Stop the app if DB is unreachable
//   }
// };

// // Export the pool — import this wherever you need to run queries
// export default pool;
/**
 * AUTHORS:
 * Database Configuration
 * Uses mysql2 with connection pooling for production-grade performance.
 * The pool reuses connections instead of creating a new one for every query.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false
  },

  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  timezone: '+00:00',
});

/**
 * Test the DB connection on startup.
 * Logs a success or error message.
 */
export const testDatabaseConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release(); // Always release back to pool
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1); // Stop the app if DB is unreachable
  }
};

// Export the pool — import this wherever you need to run queries
export default pool;