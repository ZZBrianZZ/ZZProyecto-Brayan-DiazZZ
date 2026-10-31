import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colores } from '../tema/colores';

export default function Boton({
  titulo,
  onPress,
  tipo = 'primario',
  deshabilitado = false,
  estilo,
}) {
  const estiloVariante =
    tipo === 'secundario'
      ? estilos.secundario
      : tipo === 'peligro'
        ? estilos.peligro
        : estilos.primario;

  const estilosTexto =
    tipo === 'primario'
      ? estilos.textoPrimario
      : tipo === 'peligro'
        ? estilos.textoPeligro
        : estilos.textoSecundario;

  return (
    <TouchableOpacity
      style={[estilos.boton, estiloVariante, deshabilitado && estilos.deshabilitado, estilo]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={deshabilitado}
    >
      <Text style={[estilos.texto, estilosTexto, deshabilitado && estilos.textoDeshabilitado]}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  boton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primario: {
    backgroundColor: colores.acento,
  },
  secundario: {
    backgroundColor: 'transparent',
    borderColor: colores.borde,
  },
  peligro: {
    backgroundColor: 'transparent',
    borderColor: colores.error,
  },
  deshabilitado: {
    opacity: 0.4,
  },
  texto: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textoPrimario: {
    color: colores.textoSobreAcento,
  },
  textoSecundario: {
    color: colores.textoPrincipal,
  },
  textoPeligro: {
    color: colores.error,
  },
  textoDeshabilitado: {
    color: colores.textoDesactivado,
  },
});
