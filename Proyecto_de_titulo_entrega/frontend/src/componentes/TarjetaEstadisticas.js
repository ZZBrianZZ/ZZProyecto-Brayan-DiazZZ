import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores } from '../tema/colores';
import { XP_POR_NIVEL, calcularProgresoXP } from '../servicios/gamificacion';

export default function TarjetaEstadisticas({
  nivel = 1,
  racha = 0,
  xp = 0,
  mostrarProgreso = true,
}) {
  // Progreso dentro del nivel actual, calculado con el motor de gamificación
  const progreso = calcularProgresoXP(xp);
  const progresoPorcentaje = Math.min(progreso / XP_POR_NIVEL, 1);

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.tarjeta}>
        <View style={estilos.item}>
          <Text style={estilos.valor}>{nivel}</Text>
          <Text style={estilos.etiqueta}>Nivel</Text>
        </View>

        <View style={estilos.divisor} />

        <View style={estilos.item}>
          <Text style={estilos.valor}>{racha} días</Text>
          <Text style={estilos.etiqueta}>Racha</Text>
        </View>

        <View style={estilos.divisor} />

        <View style={estilos.item}>
          <Text style={estilos.valor}>{xp} XP</Text>
          <Text style={estilos.etiqueta}>Experiencia</Text>
        </View>
      </View>

      {mostrarProgreso && (
        <View style={estilos.progresoContenedor}>
          <View style={estilos.progresoEncabezado}>
            <Text style={estilos.progresoTexto}>Nivel {nivel + 1}</Text>
            <Text style={estilos.progresoTexto}>
              {progreso} / {XP_POR_NIVEL} XP
            </Text>
          </View>
          <View style={estilos.barraFondo}>
            <View style={[estilos.barraRelleno, { width: `${progresoPorcentaje * 100}%` }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    marginVertical: 10,
  },
  tarjeta: {
    flexDirection: 'row',
    backgroundColor: colores.fondoElevado,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.borde,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  valor: {
    fontSize: 17,
    fontWeight: '600',
    color: colores.textoPrincipal,
    fontVariant: ['tabular-nums'],
  },
  etiqueta: {
    fontSize: 11,
    color: colores.textoSecundario,
    marginTop: 3,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  divisor: {
    width: 1,
    height: '70%',
    backgroundColor: colores.borde,
  },
  progresoContenedor: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  progresoEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progresoTexto: {
    fontSize: 11,
    color: colores.textoSecundario,
    fontVariant: ['tabular-nums'],
  },
  barraFondo: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colores.acentoTenue,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colores.acento,
  },
});
