require('dotenv').config();
const app = require('./app');
const conectarDB = require('./config/db');

const PORT = process.env.PORT || 5000;

conectarDB().then(async () => {
  await require('./models/HistorialLectura').init();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});
