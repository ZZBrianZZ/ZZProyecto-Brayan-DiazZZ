const express = require('express');
const router = express.Router();
const {
  obtenerPerfil,
  actualizarPerfil,
  sincronizar,
  obtenerRanking,
} = require('../controllers/usuarioController');
const auth = require('../middlewares/auth');

router.get('/perfil', auth, obtenerPerfil);
router.put('/perfil', auth, actualizarPerfil);
router.post('/sincronizar', auth, sincronizar);
router.get('/ranking', auth, obtenerRanking);

module.exports = router;
