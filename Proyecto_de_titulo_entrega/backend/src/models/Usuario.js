const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 8,
  },
  nivel: {
    type: Number,
    default: 1,
  },
  puntos: {
    type: Number,
    default: 0,
  },
  rachaDias: {
    type: Number,
    default: 0,
  },
  ultimaFechaLectura: {
    type: Date,
    default: null,
  },
  logros: {
    type: [String],
    default: [],
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
  },
});

usuarioSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

usuarioSchema.methods.compararPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
