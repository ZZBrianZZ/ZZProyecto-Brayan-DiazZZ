const express = require('express');
const router = express.Router();
const { obtenerLecturas } = require('../controllers/lecturaController');
const auth = require('../middlewares/auth');

router.get('/', auth, obtenerLecturas);

module.exports = router;
