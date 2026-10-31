// El servidor es la autoridad para las recompensas y los niveles.
const XP_POR_LECTURA = 20;
const XP_POR_NIVEL = 100;
const calcularNivel = (puntos) => Math.floor(puntos / XP_POR_NIVEL) + 1;

// Compara días UTC para mantener el criterio de las sesiones ya guardadas.
const calcularRacha = (rachaActual, ultimaFecha, fechaNueva) => {
  if (!ultimaFecha) return 1;
  const ultima = new Date(ultimaFecha).toISOString().split('T')[0];
  const nueva = new Date(fechaNueva).toISOString().split('T')[0];
  if (ultima === nueva) return rachaActual;
  const diffMs = new Date(nueva) - new Date(ultima);
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return rachaActual;
  if (diffDias === 1) return rachaActual + 1;
  return 1;
};

module.exports = { XP_POR_LECTURA, XP_POR_NIVEL, calcularNivel, calcularRacha };
