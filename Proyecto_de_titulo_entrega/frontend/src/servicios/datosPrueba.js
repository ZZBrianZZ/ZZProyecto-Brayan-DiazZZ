import lecturasGutenberg from './lecturasGutenberg.json';

export const lecturasPrueba = lecturasGutenberg.map((lectura) => ({
  ...lectura,
  id: lectura.clave,
}));
