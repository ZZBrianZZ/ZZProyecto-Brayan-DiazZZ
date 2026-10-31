import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { colores } from '../tema/colores';

// Recursos empaquetados: las imágenes del catálogo funcionan también offline.
const imagenesLocales = {
  cajal: require('../../assets/lecturas/cajal.jpg'),
  'neurona-cajal': require('../../assets/lecturas/neurona-cajal.png'),
  curie: require('../../assets/lecturas/curie.jpg'),
  galileo: require('../../assets/lecturas/galileo.jpg'),
  bolivar: require('../../assets/lecturas/bolivar.jpg'),
  hidalgo: require('../../assets/lecturas/hidalgo.jpg'),
};

export default function ImagenLectura({ imagen }) {
  const [fallo, setFallo] = useState(false);
  if (!imagen) return null;
  const fuente = imagenesLocales[imagen.id] || (imagen.url ? { uri: imagen.url } : null);
  return (
    <View style={estilos.figura}>
      {fuente && !fallo && (
        <Image
          source={fuente}
          style={estilos.imagen}
          resizeMode="contain"
          accessible
          accessibilityLabel={imagen.pie}
          onError={() => setFallo(true)}
        />
      )}
      <Text style={estilos.pie}>{imagen.pie}</Text>
      <Text style={estilos.credito}>
        {imagen.autor} · {imagen.licencia}
      </Text>
      {imagen.fuenteUrl && (
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel={`Ver fuente de la imagen: ${imagen.pie}`}
          onPress={() => Linking.openURL(imagen.fuenteUrl).catch(() => {})}
        >
          <Text style={estilos.enlace}>Fuente: Wikimedia Commons</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  figura: { marginVertical: 28 },
  imagen: { width: '100%', height: 280 },
  pie: { color: colores.textoEnfoque, fontSize: 14, lineHeight: 21, marginTop: 12 },
  credito: {
    color: colores.textoEnfoque,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.75,
    marginTop: 4,
  },
  enlace: {
    color: colores.textoEnfoque,
    fontSize: 12,
    lineHeight: 20,
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },
});
