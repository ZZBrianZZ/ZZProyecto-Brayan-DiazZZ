const request = require('supertest');
jest.mock('../src/middlewares/auth', () => (req, res, next) => {
  req.usuario = { id: 'usuario-A' };
  next();
});
jest.mock('../src/models/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../src/models/HistorialLectura', () => ({ find: jest.fn(), insertMany: jest.fn() }));
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');
const Historial = require('../src/models/HistorialLectura');
const app = require('../src/app');
let usuario;
let historial;
const sesion = {
  sesionId: 'lectura_0001',
  titulo: 'Ciencia',
  fecha: '2026-01-01',
  segundos: 30,
  xp: 999999,
};
const consulta = (obtener) => ({
  session: async () => obtener(),
  select() {
    return this;
  },
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(obtener()).then(resolve, reject);
  },
});
beforeEach(() => {
  historial = [];
  usuario = {
    _id: 'usuario-A',
    nombre: 'A',
    puntos: 0,
    nivel: 1,
    rachaDias: 0,
    ultimaFechaLectura: null,
    save: jest.fn(async () => {}),
  };
  Usuario.findById.mockImplementation(() => consulta(() => usuario));
  Historial.find.mockImplementation((filtro) =>
    consulta(() =>
      historial
        .filter(
          (h) =>
            h.usuario === filtro.usuario &&
            (!filtro.sesionId || filtro.sesionId.$in.includes(h.sesionId)),
        )
        .sort((a, b) => a.fecha - b.fecha),
    ),
  );
  Historial.insertMany.mockImplementation(async (docs, opciones) => {
    expect(opciones.session).toBeDefined();
    historial.push(...docs.map((h, i) => ({ ...h, _id: String(i) })));
  });
  jest.spyOn(mongoose.connection, 'transaction').mockImplementation(async (fn) => {
    const antes = [...historial];
    try {
      return await fn({ prueba: true });
    } catch (error) {
      historial = antes;
      throw error;
    }
  });
});
afterEach(() => jest.restoreAllMocks());
const enviar = (sesiones) => request(app).post('/api/usuarios/sincronizar').send({ sesiones });

test('reintentar una sesión no duplica historial ni XP; recompensa fija del servidor', async () => {
  expect((await enviar([sesion])).body.totalXP).toBe(20);
  const repetida = await enviar([sesion]);
  expect(repetida.status).toBe(200);
  expect(repetida.body.totalXP).toBe(0);
  expect(repetida.body.sesionesConfirmadas).toEqual([sesion.sesionId]);
  expect(historial).toHaveLength(1);
  expect(usuario.puntos).toBe(20);
});
test('deduplica también dentro de un mismo lote', async () => {
  expect((await enviar([sesion, sesion])).body.totalXP).toBe(20);
  expect(historial).toHaveLength(1);
});
test.each([
  { segundos: -1 },
  { segundos: '30' },
  { fecha: '2026-02-30' },
  { sesionId: undefined },
  { titulo: '' },
])('rechaza sesiones inválidas sin escrituras: %j', async (cambio) => {
  expect((await enviar([{ ...sesion, ...cambio }])).status).toBe(400);
  expect(historial).toHaveLength(0);
});
test('sesiones offline que llegan desordenadas reconstruyen la racha', async () => {
  await enviar([{ ...sesion, sesionId: 'lectura_0003', fecha: '2026-01-03' }, sesion]);
  await enviar([{ ...sesion, sesionId: 'lectura_0002', fecha: '2026-01-02' }]);
  expect(usuario.rachaDias).toBe(3);
  expect(usuario.ultimaFechaLectura.toISOString().slice(0, 10)).toBe('2026-01-03');
});
test('perfil conserva identificador y última fecha necesaria para la racha', async () => {
  await enviar([sesion]);
  const res = await request(app).get('/api/usuarios/perfil');
  expect(res.body.id).toBe('usuario-A');
  expect(res.body.ultimaFechaLectura).toBe('2026-01-01T00:00:00.000Z');
  expect(res.body.historial[0].sesionId).toBe(sesion.sesionId);
});
test('un fallo al guardar puntos aborta la transacción del historial', async () => {
  usuario.save.mockRejectedValueOnce(new Error('fallo simulado'));
  expect((await enviar([sesion])).status).toBe(500);
  expect(historial).toHaveLength(0);
});
