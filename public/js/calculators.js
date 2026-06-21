function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return value;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.calculator-form');
  const panel = document.querySelector('[data-result-panel]');
  if (!form || !panel) return;

  const resultList = panel.querySelector('[data-result-list]');
  const whatsappLink = panel.querySelector('[data-whatsapp-result]');
  const saveForm = panel.querySelector('[data-save-simulation]');
  const saveMessage = panel.querySelector('[data-save-message]');
  let lastInput = {};
  let lastResult = {};

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(form.dataset.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const payload = await response.json();
    if (!payload.ok) return;

    lastInput = data;
    lastResult = payload.result;
    resultList.innerHTML = '';
    Object.entries(payload.result)
      .filter(([key]) => key !== 'total_formatado')
      .forEach(([key, value]) => {
        const row = document.createElement('div');
        row.innerHTML = `<span>${formatLabel(key)}</span><strong>${formatValue(value)}</strong>`;
        resultList.appendChild(row);
      });

    const text = `Resultado ${form.dataset.calculator}: ${JSON.stringify(payload.result)}`;
    whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    panel.hidden = false;
  });

  if (saveForm) {
    saveForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const contact = Object.fromEntries(new FormData(saveForm).entries());
      const response = await fetch('/api/simulacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contact,
          input_data: lastInput,
          result_data: lastResult
        })
      });
      const payload = await response.json();
      saveMessage.textContent = payload.ok ? 'Simulação salva.' : 'Não foi possível salvar.';
    });
  }
});
