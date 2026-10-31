const Usuario = require('../models/Usuario');
const HistorialLectura = require('../models/HistorialLectura');
const mongoose = require('mongoose');
const { XP_POR_LECTURA, calcularNivel, calcularRacha } = require('../utilidades/gamificacion');
const MAXIMO_SESIONES_POR_LOTE = 100;
const errorSolicitud = (mensaje) => Object.assign(new Error(mensaje), { status: 400 });

// Una fecha válida debe existir en el calendario y no estar en el futuro.
const fechaValida = (fecha) =>
  typeof fecha === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
  Number.isFinite(Date.parse(fecha)) &&
  new Date(fecha).toISOString().slice(0, 10) === fecha &&
  fecha <= new Date().toISOString().slice(0, 10);

// Rechaza entradas inválidas antes de iniciar una transacción.
const sesionValida = (lectura) =>
  Boolean(lectura) &&
  typeof lectura.sesionId === 'string' &&
  /^[a-zA-Z0-9_-]{8,100}$/.test(lectura.sesionId) &&
  typeof lectura.titulo === 'string' &&
  lectura.titulo.trim().length > 0 &&
  lectura.titulo.length <= 300 &&
  Number.isSafeInteger(lectura.segundos) &&
  lectura.segundos >= 0 &&
  fechaValida(lectura.fecha);

// Deduplica el lote y asigna la recompensa del servidor.
const prepararSesiones = (sesiones, usuarioId) => {
  if (!Array.isArray(sesiones) || !sesiones.length || sesiones.length > MAXIMO_SESIONES_POR_LOTE) {
    throw errorSolicitud('Se requieren entre 1 y 100 sesiones');
  }
  const sesionesPorId = new Map();
  for (const sesionLectura of sesiones) {
    if (!sesionValida(sesionLectura)) {
      throw errorSolicitud('Sesión inválida: revisa identificador, título, fecha y duración');
    }
    sesionesPorId.set(sesionLectura.sesionId, {
      usuario: usuarioId,
      sesionId: sesionLectura.sesionId,
      titulo: sesionLectura.titulo.trim(),
      fecha: new Date(sesionLectura.fecha),
      segundos: sesionLectura.segundos,
      xp: XP_POR_LECTURA, // La recompensa pertenece al servidor, nunca al cliente.
    });
  }

  return sesionesPorId;
};

// Reconstruye la racha en orden cronológico, incluso si llegan sesiones antiguas.
const actualizarProgreso = async (usuario, cantidadNuevas, usuarioId, transaccion) => {
  usuario.puntos += cantidadNuevas * XP_POR_LECTURA;
  usuario.nivel = calcularNivel(usuario.puntos);
  const historial = await HistorialLectura.find({ usuario: usuarioId })
    .select('fecha')
    .sort({ fecha: 1 })
    .session(transaccion);
  let racha = 0;
  let ultimaFecha = null;
  for (const lectura of historial) {
    racha = calcularRacha(racha, ultimaFecha, lectura.fecha);
    ultimaFecha = lectura.fecha;
  }
  usuario.rachaDias = racha;
  usuario.ultimaFechaLectura = ultimaFecha;
  await usuario.save({ session: transaccion });
};

const sincronizarLecturas = async (usuarioId, sesiones) => {
  const sesionesPorId = prepararSesiones(sesiones, usuarioId);
  // Una transacción impide guardar el historial sin sus puntos, o viceversa.
  return mongoose.connection.transaction(async (transaccion) => {
    const usuario = await Usuario.findById(usuarioId).session(transaccion);
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    const existentes = await HistorialLectura.find({
      usuario: usuarioId,
      sesionId: { $in: [...sesionesPorId.keys()] },
    }).session(transaccion);
    const identificadoresGuardados = new Set(
      existentes.map((sesionLectura) => sesionLectura.sesionId),
    );
    const nuevas = [...sesionesPorId.values()].filter(
      (sesionLectura) => !identificadoresGuardados.has(sesionLectura.sesionId),
    );
    if (nuevas.length) {
      await HistorialLectura.insertMany(nuevas, { session: transaccion });
      await actualizarProgreso(usuario, nuevas.length, usuarioId, transaccion);
    }
    return {
      mensaje: `${nuevas.length} sesiones sincronizadas`,
      totalXP: nuevas.length * XP_POR_LECTURA,
      sesionesConfirmadas: [...sesionesPorId.keys()],
    };
  });
};
module.exports = { sincronizarLecturas };
