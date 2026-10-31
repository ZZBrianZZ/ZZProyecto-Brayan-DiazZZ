const mongoose = require('mongoose');

const historialLecturaSchema = new mongoose.Schema({
  sesionId: { type: String },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
  titulo: {
    type: String,
    required: true,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
  segundos: {
    type: Number,
    required: true,
  },
  xp: {
    type: Number,
    required: true,
  },
});

// Los documentos antiguos no tienen sesionId; conservarlos sin colisiones.
historialLecturaSchema.index(
  { usuario: 1, sesionId: 1 },
  {
    unique: true,
    partialFilterExpression: { sesionId: { $type: 'string' } },
  },
);

module.exports = mongoose.model('HistorialLectura', historialLecturaSchema);
