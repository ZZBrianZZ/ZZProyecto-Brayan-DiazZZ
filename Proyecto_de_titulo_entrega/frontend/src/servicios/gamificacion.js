// ─── Motor de gamificación ───
// Centraliza las fórmulas de nivel y racha para que toda la app
// calcule igual y no haya lógica duplicada entre pantallas.

// Constante base: cada nivel requiere 100 XP
// Recompensa local provisional; el servidor confirma los puntos al sincronizar.
export const XP_POR_LECTURA = 20;
export const XP_POR_NIVEL = 100;

// A partir de los puntos totales devuelve el nivel del usuario
// (empieza en 1 y sube uno por cada 100 XP acumulados)
export const calcularNivel = (puntos) => Math.floor(puntos / XP_POR_NIVEL) + 1;

// Cuánto XP lleva el usuario dentro de su nivel actual (para la barra de progreso)
export const calcularProgresoXP = (puntos) => puntos % XP_POR_NIVEL;

// Diferencia en días entre dos fechas en formato YYYY-MM-DD
const diferenciaEnDias = (fechaInicial, fechaFinal) => {
  const inicio = new Date(fechaInicial);
  const fin = new Date(fechaFinal);
  return Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
};

// Actualiza la racha diaria según la última fecha de lectura:
// - Sin lecturas previas        → arranca en 1
// - Lectura del día anterior    → suma 1 a la racha
// - Pasaron más de un día       → se reinicia a 1
// - Misma fecha (segunda lectura) → no cambia
export const actualizarRacha = (rachaActual, ultimaFechaLectura, hoy) => {
  if (!ultimaFechaLectura) return 1;

  const diferencia = diferenciaEnDias(ultimaFechaLectura, hoy);

  if (diferencia === 1) return rachaActual + 1;
  if (diferencia > 1) return 1;
  return rachaActual;
};
