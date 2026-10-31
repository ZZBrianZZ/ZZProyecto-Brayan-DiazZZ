const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { emailValido, nombreValido, normalizarEmail } = require('../utilidades/validacion');

const generarToken = (usuario) => {
  return jwt.sign({ id: usuario._id, email: usuario.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Valida los datos, crea la cuenta y devuelve un token sin exponer la contraseña.
exports.registro = async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};

    if (!nombreValido(nombre) || typeof password !== 'string' || !password || !email) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    if (!emailValido(email)) {
      return res.status(400).json({ mensaje: 'Email inválido' });
    }

    if (password.length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res
        .status(400)
        .json({ mensaje: 'La contraseña debe contener una mayúscula y un número' });
    }

    const existe = await Usuario.findOne({ email: normalizarEmail(email) });
    if (existe) {
      return res.status(409).json({ mensaje: 'El email ya está registrado' });
    }

    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      email: normalizarEmail(email),
      password,
    });
    const token = generarToken(usuario);

    res.status(201).json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        nivel: usuario.nivel,
        puntos: usuario.puntos,
        rachaDias: usuario.rachaDias,
      },
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ mensaje: 'El email ya está registrado' });
    console.error('Error en registro:', error.name);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Comprueba el hash de la contraseña antes de emitir una credencial de acceso.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!emailValido(email) || typeof password !== 'string' || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
    }

    const usuario = await Usuario.findOne({ email: normalizarEmail(email) });
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const passwordCorrecto = await usuario.compararPassword(password);
    if (!passwordCorrecto) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario);

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        nivel: usuario.nivel,
        puntos: usuario.puntos,
        rachaDias: usuario.rachaDias,
      },
    });
  } catch (error) {
    console.error('Error en login:', error.name);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};
