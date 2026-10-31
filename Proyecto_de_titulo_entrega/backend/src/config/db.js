const mongoose = require('mongoose');

const conectarDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('Falta MONGO_URI en backend/.env');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'lector_enfoque',
    });
    console.log(`MongoDB conectado: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = conectarDB;
