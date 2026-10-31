import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colores } from '../tema/colores';

export default function ModalFelicitacion({
  visible,
  xp = 0,
  racha = 0,
  nivel = 1,
  tiempoLeido = '00:00',
  onContinuar,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinuar}>
      <View style={estilos.fondo}>
        <View style={estilos.tarjeta}>
          <View style={estilos.circulo}>
            <Text style={estilos.icono}>🌿</Text>
          </View>

          <Text style={estilos.titulo}>¡Lectura completada!</Text>
          <Text style={estilos.subtitulo}>Tu mente te lo agradece.</Text>

          <View style={estilos.detalles}>
            <View style={estilos.fila}>
              <Text style={estilos.etiqueta}>XP ganados</Text>
              <Text style={estilos.valorXP}>+{xp} XP</Text>
            </View>
            <View style={estilos.divisor} />
            <View style={estilos.fila}>
              <Text style={estilos.etiqueta}>Tiempo leído</Text>
              <Text style={estilos.valor}>{tiempoLeido}</Text>
            </View>
            <View style={estilos.divisor} />
            <View style={estilos.fila}>
              <Text style={estilos.etiqueta}>Racha actual</Text>
              <Text style={estilos.valor}>🔥 {racha} días</Text>
            </View>
            <View style={estilos.divisor} />
            <View style={estilos.fila}>
              <Text style={estilos.etiqueta}>Nivel</Text>
              <Text style={estilos.valor}>⭐ {nivel}</Text>
            </View>
          </View>

          <TouchableOpacity style={estilos.boton} onPress={onContinuar} activeOpacity={0.7}>
            <Text style={estilos.textoBoton}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colores.superposicion,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colores.fondoElevado,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
  },
  circulo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colores.acentoTenue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icono: {
    fontSize: 32,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '600',
    color: colores.textoPrincipal,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 13,
    color: colores.textoSecundario,
    marginBottom: 24,
  },
  detalles: {
    width: '100%',
    backgroundColor: colores.fondo,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  etiqueta: {
    fontSize: 13,
    color: colores.textoSecundario,
  },
  valor: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.textoPrincipal,
    fontVariant: ['tabular-nums'],
  },
  valorXP: {
    fontSize: 16,
    fontWeight: '700',
    color: colores.acentoTexto,
    fontVariant: ['tabular-nums'],
  },
  divisor: {
    height: 1,
    backgroundColor: colores.borde,
  },
  boton: {
    width: '100%',
    backgroundColor: colores.acento,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  textoBoton: {
    color: colores.textoSobreAcento,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
