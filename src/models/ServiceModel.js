const db = require('../config/database');

async function findActive() {
  const [rows] = await db.execute(
    `SELECT * FROM services
     WHERE active = 1
       AND title NOT IN (?, ?)
     ORDER BY id`,
    ['Consultoria em Departamento Pessoal', 'Organização de processos de DP']
  );
  return rows;
}

module.exports = {
  findActive
};
