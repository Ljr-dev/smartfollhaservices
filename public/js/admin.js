document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('textarea').forEach((field) => {
    field.style.minHeight = field.rows > 5 ? '180px' : '110px';
  });
});
