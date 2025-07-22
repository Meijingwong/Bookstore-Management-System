import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
    host: '34.71.56.251',
    port: 3306,
    user: 'testing',
    password: '#book123',
    database: 'bookstore',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// const db = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '#Bookstore123',
//     database: 'bookstore',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

export default db;
