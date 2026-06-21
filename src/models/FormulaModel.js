const db = require('../config/database');

async function findAll(calculatorType) {
  const params = [];
  let sql = 'SELECT * FROM formulas';
  if (calculatorType) {
    sql += ' WHERE calculator_type = ?';
    params.push(calculatorType);
  }
  sql += ' ORDER BY calculator_type, id';
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM formulas WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findActiveByCalculator(calculatorType) {
  const [rows] = await db.execute(
    'SELECT * FROM formulas WHERE calculator_type = ? AND active = 1 ORDER BY id',
    [calculatorType]
  );
  return rows;
}

async function create(data) {
  const [result] = await db.execute(
    `INSERT INTO formulas
     (calculator_type, field_name, label, description, formula_expression, legal_observation, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.calculator_type,
      data.field_name,
      data.label,
      data.description,
      data.formula_expression,
      data.legal_observation,
      data.active ? 1 : 0
    ]
  );
  return result.insertId;
}

async function update(id, data) {
  await db.execute(
    `UPDATE formulas
     SET field_name = ?, label = ?, description = ?, formula_expression = ?, legal_observation = ?, active = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      data.field_name,
      data.label,
      data.description,
      data.formula_expression,
      data.legal_observation,
      data.active ? 1 : 0,
      id
    ]
  );
}

module.exports = {
  findAll,
  findById,
  findActiveByCalculator,
  create,
  update
};
