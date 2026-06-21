const db = require('../config/database');
const { parseJson } = require('../controllers/helpers');

function normalizeCalculator(row) {
  if (!row) return null;
  return {
    ...row,
    active: Boolean(row.active)
  };
}

function normalizeField(row) {
  if (!row) return null;
  return {
    ...row,
    required: Boolean(row.required),
    active: Boolean(row.active),
    options: parseJson(row.options_json, [])
  };
}

async function findAll() {
  const [rows] = await db.execute('SELECT * FROM calculators ORDER BY sort_order, title');
  return rows.map(normalizeCalculator);
}

async function findActive() {
  const [rows] = await db.execute('SELECT * FROM calculators WHERE active = 1 ORDER BY sort_order, title');
  return rows.map(normalizeCalculator);
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM calculators WHERE id = ? LIMIT 1', [id]);
  return normalizeCalculator(rows[0]);
}

async function findByType(type) {
  const [rows] = await db.execute('SELECT * FROM calculators WHERE calculator_type = ? LIMIT 1', [type]);
  return normalizeCalculator(rows[0]);
}

async function findBySlug(slug) {
  const [rows] = await db.execute('SELECT * FROM calculators WHERE slug = ? LIMIT 1', [slug]);
  return normalizeCalculator(rows[0]);
}

async function fields(calculatorId, onlyActive = false) {
  const sql = onlyActive
    ? 'SELECT * FROM calculator_fields WHERE calculator_id = ? AND active = 1 ORDER BY sort_order, id'
    : 'SELECT * FROM calculator_fields WHERE calculator_id = ? ORDER BY sort_order, id';
  const [rows] = await db.execute(sql, [calculatorId]);
  return rows.map(normalizeField);
}

async function fieldById(id) {
  const [rows] = await db.execute('SELECT * FROM calculator_fields WHERE id = ? LIMIT 1', [id]);
  return normalizeField(rows[0]);
}

async function create(data) {
  const [result] = await db.execute(
    `INSERT INTO calculators
     (calculator_type, slug, title, description, cta_text, active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.calculator_type,
      data.slug,
      data.title,
      data.description,
      data.cta_text,
      data.active ? 1 : 0,
      data.sort_order || 0
    ]
  );
  return result.insertId;
}

async function update(id, data) {
  await db.execute(
    `UPDATE calculators
     SET calculator_type = ?, slug = ?, title = ?, description = ?, cta_text = ?,
         active = ?, sort_order = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      data.calculator_type,
      data.slug,
      data.title,
      data.description,
      data.cta_text,
      data.active ? 1 : 0,
      data.sort_order || 0,
      id
    ]
  );
}

async function createField(calculatorId, data) {
  const [result] = await db.execute(
    `INSERT INTO calculator_fields
     (calculator_id, field_name, label, input_type, required, placeholder, default_value,
      min_value, max_value, step_value, options_json, help_text, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      calculatorId,
      data.field_name,
      data.label,
      data.input_type,
      data.required ? 1 : 0,
      data.placeholder,
      data.default_value,
      data.min_value,
      data.max_value,
      data.step_value,
      data.options_json,
      data.help_text,
      data.sort_order || 0,
      data.active ? 1 : 0
    ]
  );
  return result.insertId;
}

async function updateField(id, data) {
  await db.execute(
    `UPDATE calculator_fields
     SET field_name = ?, label = ?, input_type = ?, required = ?, placeholder = ?,
         default_value = ?, min_value = ?, max_value = ?, step_value = ?,
         options_json = ?, help_text = ?, sort_order = ?, active = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      data.field_name,
      data.label,
      data.input_type,
      data.required ? 1 : 0,
      data.placeholder,
      data.default_value,
      data.min_value,
      data.max_value,
      data.step_value,
      data.options_json,
      data.help_text,
      data.sort_order || 0,
      data.active ? 1 : 0,
      id
    ]
  );
}

module.exports = {
  findAll,
  findActive,
  findById,
  findByType,
  findBySlug,
  fields,
  fieldById,
  create,
  update,
  createField,
  updateField
};
