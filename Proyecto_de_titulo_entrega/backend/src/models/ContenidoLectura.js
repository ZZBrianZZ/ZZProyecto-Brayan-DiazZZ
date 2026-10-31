const mongoose = require('mongoose');

const contenidoLecturaSchema = new mongoose.Schema({
  clave: { type: String },
  autor: { type: String },
  obraOriginal: { type: String },
  fuenteUrl: { type: String },
  esFragmento: { type: Boolean },
  palabras: { type: Number },
  derechos: { type: String },
  imagenes: {
    type: [
      {
        _id: false,
        id: { type: String, required: true },
        url: { type: String, required: true },
        pie: { type: String, required: true },
        autor: { type: String, required: true },
        licencia: { type: String, required: true },
        fuenteUrl: { type: String, required: true },
        ancho: { type: Number },
        alto: { type: Number },
        posicion: { type: String, enum: ['inicio', 'mitad'] },
      },
    ],
    default: [],
    validate: {
      validator: (imagenes) => imagenes.length <= 2,
      message: 'Cada lectura admite hasta dos imágenes',
    },
  },
  titulo: {
    type: String,
    required: true,
  },
  categoria: {
    type: String,
    required: true,
  },
  tiempoEstimado: {
    type: Number,
    required: true,
  },
  texto: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('ContenidoLectura', contenidoLecturaSchema);
