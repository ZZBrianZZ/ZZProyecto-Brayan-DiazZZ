const Usuario = require('../models/Usuario');
const HistorialLectura = require('../models/HistorialLectura');
const { sincronizarLecturas } = require('../servicios/sincronizacionLecturas');
const { emailValido, nombreValido, normalizarEmail } = require('../utilidades/validacion');

// Devuelve las estadísticas personales y las últimas sesiones, excluyendo datos sensibles.
exports.obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password -__v');
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const historial = await HistorialLectura.find({ usuario: usuario._id })
      .sort({ fecha: -1 })
      .limit(20)
      .select('-__v');

    res.json({
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      nivel: usuario.nivel,
      puntos: usuario.puntos,
      rachaDias: usuario.rachaDias,
      ultimaFechaLectura: usuario.ultimaFechaLectura,
      historial: historial.map((h) => ({
        id: h._id,
        sesionId: h.sesionId,
        titulo: h.titulo,
        fecha: h.fecha.toISOString().split('T')[0],
        segundos: h.segundos,
        xp: h.xp,
      })),
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Solo permite modificar nombre y correo; los puntos y niveles se calculan en el servidor.
exports.actualizarPerfil = async (req, res) => {
  try {
    const { nombre, email } = req.body || {};
    const cambiosPerfil = {};
    if (nombre !== undefined) {
      if (!nombreValido(nombre))
        return res.status(400).json({ mensaje: 'Nombre inválido (1 a 100 caracteres)' });
      cambiosPerfil.nombre = nombre.trim();
    }
    if (email !== undefined) {
      if (!emailValido(email)) return res.status(400).json({ mensaje: 'Email inválido' });
      cambiosPerfil.email = normalizarEmail(email);
    }
    if (!Object.keys(cambiosPerfil).length)
      return res.status(400).json({ mensaje: 'Indica nombre o email para actualizar' });

    const usuario = await Usuario.findByIdAndUpdate(req.usuario.id, cambiosPerfil, {
      new: true,
      runValidators: true,
    }).select('-password -__v');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({
      nombre: usuario.nombre,
      email: usuario.email,
      nivel: usuario.nivel,
      puntos: usuario.puntos,
      rachaDias: usuario.rachaDias,
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ mensaje: 'El email ya está registrado' });
    if (error.name === 'ValidationError')
      return res.status(400).json({ mensaje: 'Datos de perfil inválidos' });
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// La capa HTTP delega la validación y la transacción al servicio de sincronización.
exports.sincronizar = async (req, res) => {
  try {
    const resultado = await sincronizarLecturas(req.usuario.id, req.body?.sesiones);
    res.json(resultado);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ mensaje: error.status ? error.message : 'Error del servidor' });
  }
};

// Ordena por experiencia acumulada y limita la respuesta a los veinte primeros usuarios.
exports.obtenerRanking = async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select('nombre nivel puntos')
      .sort({ puntos: -1 })
      .limit(20);

    res.json(
      usuarios.map((u, i) => ({
        posicion: i + 1,
        nombre: u.nombre,
        nivel: u.nivel,
        puntos: u.puntos,
      })),
    );
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};
