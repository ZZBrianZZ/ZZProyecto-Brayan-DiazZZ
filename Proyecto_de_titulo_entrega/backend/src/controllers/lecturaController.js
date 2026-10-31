const ContenidoLectura = require('../models/ContenidoLectura');

exports.obtenerLecturas = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.categoria !== undefined && typeof req.query.categoria !== 'string') {
      return res.status(400).json({ mensaje: 'La categoría debe ser un texto' });
    }
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    const lecturas = await ContenidoLectura.find(filtro).select('-__v');
    res.json(lecturas.map((lectura) => ({ ...lectura.toObject(), id: String(lectura._id) })));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};
