const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '187.45.255.177',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'NovaSenhaForte123!',
  database: process.env.DB_NAME || 'smart_folha_services',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

module.exports = pool;
