const emailValido = (valor) =>
  typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
const nombreValido = (valor) =>
  typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= 100;
const normalizarEmail = (email) => email.trim().toLowerCase();
module.exports = { emailValido, nombreValido, normalizarEmail };
