const db = require('../config/database');

async function create(data) {
  const [result] = await db.execute(
    `INSERT INTO leads
      (name, email, phone, company, service_interest, message, source_page, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Novo')`,
    [
      data.name,
      data.email,
      data.phone,
      data.company,
      data.service_interest,
      data.message,
      data.source_page
    ]
  );
  return result.insertId;
}

async function countAll() {
  const [rows] = await db.execute('SELECT COUNT(*) AS total FROM leads');
  return rows[0].total;
}

async function countByStatus(status) {
  const [rows] = await db.execute('SELECT COUNT(*) AS total FROM leads WHERE status = ?', [status]);
  return rows[0].total;
}

async function findAll(status) {
  const params = [];
  let sql = 'SELECT * FROM leads';
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function latest(limit = 5) {
  const safeLimit = Math.max(1, Number.parseInt(limit, 10) || 5);
  const [rows] = await db.execute(
    `SELECT * FROM leads ORDER BY created_at DESC LIMIT ${safeLimit}`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function updateStatus(id, status) {
  await db.execute('UPDATE leads SET status = ? WHERE id = ?', [status, id]);
}

module.exports = {
  create,
  countAll,
  countByStatus,
  findAll,
  latest,
  findById,
  updateStatus
};
