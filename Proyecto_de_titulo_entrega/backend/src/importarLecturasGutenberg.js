const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const ContenidoLectura = require('./models/ContenidoLectura');
const lecturas = require('./datos/lecturasGutenberg.json');

async function importar() {
  try {
    // Validar el catálogo completo antes de conectar o escribir.
    if (lecturas.length !== 3 || new Set(lecturas.map((l) => l.clave)).size !== 3) {
      throw new Error('Se esperaban tres lecturas con claves diferentes');
    }
    for (const lectura of lecturas) {
      if (!lectura.imagenes || lectura.imagenes.length !== 2) {
        throw new Error('Cada lectura seleccionada debe tener dos imágenes');
      }
      await new ContenidoLectura(lectura).validate();
    }
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en backend/.env');
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'lector_enfoque',
      serverSelectionTimeoutMS: 15000,
    });
    for (const lectura of lecturas) {
      // Reconocer también una importación manual previa con el mismo título.
      const existente = await ContenidoLectura.findOne({
        $or: [{ clave: lectura.clave }, { titulo: lectura.titulo }],
      })
        .select('_id')
        .lean();
      await ContenidoLectura.updateOne(
        existente ? { _id: existente._id } : { clave: lectura.clave },
        { $set: lectura },
        { upsert: true, runValidators: true },
      );
    }
    const guardadas = await ContenidoLectura.find({
      clave: { $in: lecturas.map((l) => l.clave) },
    }).lean();
    for (const lectura of lecturas) {
      const guardada = guardadas.find((l) => l.clave === lectura.clave);
      if (
        !guardada ||
        guardada.texto !== lectura.texto ||
        guardada.autor !== lectura.autor ||
        JSON.stringify(guardada.imagenes) !== JSON.stringify(lectura.imagenes)
      ) {
        throw new Error(`No se pudo verificar: ${lectura.titulo}`);
      }
    }
    console.log(
      `Importación verificada: ${guardadas.length} lecturas. Catálogo total: ${await ContenidoLectura.countDocuments()}.`,
    );
    guardadas.forEach((l) => console.log(`${l.titulo}: ${l.tiempoEstimado} minutos`));
  } catch (error) {
    // No imprimir URI, credenciales ni mensajes de conexión con datos sensibles.
    console.error(
      `Importación fallida (${error.name || 'Error'}). Revisar conexión y configuración local.`,
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
importar();
