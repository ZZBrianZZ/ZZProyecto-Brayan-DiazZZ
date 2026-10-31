const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const usuarioRoutes = require('./routes/usuarios');
const lecturaRoutes = require('./routes/lecturas');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/lecturas', lecturaRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'JSON inválido' });
  if (err.type === 'entity.too.large')
    return res.status(413).json({ mensaje: 'Solicitud demasiado grande' });
  console.error('Error no capturado:', err.name);
  res.status(500).json({ mensaje: 'Error del servidor' });
});

module.exports = app;
