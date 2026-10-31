const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('../src/middlewares/auth', () => (req, res, next) => {
  req.usuario = { id: 'usuario-A' };
  next();
});
jest.mock('../src/models/Usuario', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../src/models/ContenidoLectura', () => ({ find: jest.fn() }));
const Usuario = require('../src/models/Usuario');
const Contenido = require('../src/models/ContenidoLectura');
const app = require('../src/app');
const secretoAnterior = process.env.JWT_SECRET;
beforeAll(() => {
  process.env.JWT_SECRET = 'secreto-exclusivo-de-pruebas-locales';
});
afterAll(() => {
  if (secretoAnterior === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = secretoAnterior;
});
beforeEach(() => jest.resetAllMocks());
const valido = { nombre: ' Ana ', email: ' ANA@EJEMPLO.CL ', password: 'Password1' };

test.each([
  { email: { $ne: null } },
  { password: ['Password1'] },
  { nombre: '   ' },
  { password: 'sinmayuscula1' },
  { password: 'Sinnumeros' },
])('registro rechaza entradas inválidas antes de escribir: %j', async (cambio) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...valido, ...cambio });
  expect(res.status).toBe(400);
  expect(Usuario.create).not.toHaveBeenCalled();
  expect(Usuario.findOne).not.toHaveBeenCalled();
});
test('registro normaliza correo y emite un JWT válido sin devolver contraseña', async () => {
  Usuario.findOne.mockResolvedValue(null);
  Usuario.create.mockImplementation(async (d) => ({
    ...d,
    _id: 'usuario-A',
    nivel: 1,
    puntos: 0,
    rachaDias: 0,
  }));
  const res = await request(app).post('/api/auth/register').send(valido);
  expect(res.status).toBe(201);
  expect(Usuario.create).toHaveBeenCalledWith({
    nombre: 'Ana',
    email: 'ana@ejemplo.cl',
    password: valido.password,
  });
  expect(jwt.verify(res.body.token, process.env.JWT_SECRET).id).toBe('usuario-A');
  expect(res.body.usuario.password).toBeUndefined();
});
test('registro concurrente con correo duplicado devuelve 409', async () => {
  Usuario.findOne.mockResolvedValue(null);
  Usuario.create.mockRejectedValue(Object.assign(new Error('duplicado'), { code: 11000 }));
  expect((await request(app).post('/api/auth/register').send(valido)).status).toBe(409);
});
test('login rechaza un objeto como correo sin consultar MongoDB', async () => {
  expect(
    (
      await request(app)
        .post('/api/auth/login')
        .send({ email: { $ne: null }, password: 'Password1' })
    ).status,
  ).toBe(400);
  expect(Usuario.findOne).not.toHaveBeenCalled();
});
test('login normaliza el correo y admite contraseñas antiguas válidas', async () => {
  Usuario.findOne.mockResolvedValue({
    _id: 'usuario-A',
    email: 'ana@ejemplo.cl',
    compararPassword: async () => true,
  });
  expect(
    (await request(app).post('/api/auth/login').send({ email: valido.email, password: 'password' }))
      .status,
  ).toBe(200);
  expect(Usuario.findOne).toHaveBeenCalledWith({ email: 'ana@ejemplo.cl' });
});
test.each([
  {},
  { nombre: ' ' },
  { email: 'no-es-correo' },
  { email: { $ne: null } },
  { nombre: ['Ana'] },
])('editar perfil rechaza campos inválidos sin escribir: %j', async (datos) => {
  expect((await request(app).put('/api/usuarios/perfil').send(datos)).status).toBe(400);
  expect(Usuario.findByIdAndUpdate).not.toHaveBeenCalled();
});
test('editar perfil trata un correo ocupado como conflicto', async () => {
  Usuario.findByIdAndUpdate.mockReturnValue({
    select: async () => {
      throw Object.assign(new Error('duplicado'), { code: 11000 });
    },
  });
  expect(
    (await request(app).put('/api/usuarios/perfil').send({ email: 'ana@ejemplo.cl' })).status,
  ).toBe(409);
});
test('el catálogo entrega identificadores consistentes para las tarjetas', async () => {
  Contenido.find.mockReturnValue({
    select: async () => [
      { _id: 'lectura-A', toObject: () => ({ _id: 'lectura-A', titulo: 'Lectura' }) },
    ],
  });
  const res = await request(app).get('/api/lecturas');
  expect(res.status).toBe(200);
  expect(res.body[0].id).toBe('lectura-A');
});
test('JSON mal formado devuelve 400 en vez de error interno', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{mal');
  expect(res.status).toBe(400);
});
