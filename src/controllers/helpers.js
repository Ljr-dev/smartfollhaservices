function sanitize(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/[<>]/g, '');
}

function sanitizeOptional(value) {
  const cleaned = sanitize(value);
  return cleaned || null;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const normalized = String(value).replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  sanitize,
  sanitizeOptional,
  toNumber,
  formatCurrency,
  parseJson
};
