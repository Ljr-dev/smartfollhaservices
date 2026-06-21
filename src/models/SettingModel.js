const db = require('../config/database');

async function allAsObject() {
  const [rows] = await db.execute('SELECT setting_key, setting_value FROM settings');
  return rows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});
}

async function updateMany(settings) {
  const entries = Object.entries(settings);
  for (const [key, value] of entries) {
    await db.execute(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value]
    );
  }
}

module.exports = {
  allAsObject,
  updateMany
};
