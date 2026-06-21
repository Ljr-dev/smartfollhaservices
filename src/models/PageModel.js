const db = require('../config/database');

async function findAll() {
  const [rows] = await db.execute('SELECT * FROM pages ORDER BY slug');
  return rows;
}

async function findBySlug(slug) {
  const [rows] = await db.execute('SELECT * FROM pages WHERE slug = ? AND active = 1 LIMIT 1', [slug]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM pages WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function update(id, data) {
  await db.execute(
    `UPDATE pages
     SET title = ?, meta_description = ?, heading = ?, content = ?, cta_text = ?, active = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      data.title,
      data.meta_description,
      data.heading,
      data.content,
      data.cta_text,
      data.active ? 1 : 0,
      id
    ]
  );
}

module.exports = {
  findAll,
  findBySlug,
  findById,
  update
};
