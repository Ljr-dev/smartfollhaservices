const db = require('../config/database');

async function create(data) {
  const [result] = await db.execute(
    `INSERT INTO simulations
      (calculator_type, user_name, user_email, user_phone, input_data, result_data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.calculator_type,
      data.user_name,
      data.user_email,
      data.user_phone,
      JSON.stringify(data.input_data || {}),
      JSON.stringify(data.result_data || {})
    ]
  );
  return result.insertId;
}

async function countAll() {
  const [rows] = await db.execute('SELECT COUNT(*) AS total FROM simulations');
  return rows[0].total;
}

async function countByType() {
  const [rows] = await db.execute(
    'SELECT calculator_type, COUNT(*) AS total FROM simulations GROUP BY calculator_type ORDER BY total DESC'
  );
  return rows;
}

async function findAll(calculatorType) {
  const params = [];
  let sql = 'SELECT * FROM simulations';
  if (calculatorType) {
    sql += ' WHERE calculator_type = ?';
    params.push(calculatorType);
  }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await db.execute(sql, params);
  return rows;
}

module.exports = {
  create,
  countAll,
  countByType,
  findAll
};
