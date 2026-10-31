import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colores } from '../tema/colores';

export default function TarjetaLectura({ titulo = '', categoria = 'General', tiempo, onPress }) {
  return (
    <TouchableOpacity style={estilos.tarjeta} onPress={onPress} activeOpacity={0.6}>
      <View style={estilos.contenido}>
        <View style={estilos.encabezado}>
          <View style={estilos.badge}>
            <Text style={estilos.categoria}>{categoria.toUpperCase()}</Text>
          </View>
          {tiempo !== undefined && <Text style={estilos.tiempo}>{tiempo} min</Text>}
        </View>
        <Text style={estilos.titulo}>{titulo}</Text>
      </View>

      <Text style={estilos.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.fondoElevado,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  contenido: {
    flex: 1,
    marginRight: 8,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: colores.acentoTenue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoria: {
    fontSize: 10,
    fontWeight: '600',
    color: colores.acentoTexto,
    letterSpacing: 0.6,
  },
  tiempo: {
    fontSize: 12,
    color: colores.textoSecundario,
    fontVariant: ['tabular-nums'],
  },
  titulo: {
    fontSize: 15,
    fontWeight: '500',
    color: colores.textoPrincipal,
    lineHeight: 21,
  },
  chevron: {
    fontSize: 22,
    color: colores.textoDesactivado,
    marginLeft: 4,
  },
});
