import React, { useContext } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, StatusBar } from 'react-native';
import NavegadorPrincipal from './src/navegacion/NavegadorPrincipal';
import { ProveedorUsuario, ContextoUsuario } from './src/contexto/ContextoUsuario';
import { colores } from './src/tema/colores';

function PantallaCargaSesion() {
  return (
    <View style={estilos.carga}>
      <View style={estilos.circulo}>
        <Text style={estilos.panda}>🐼</Text>
      </View>
      <ActivityIndicator size="small" color={colores.acentoTexto} style={{ marginTop: 20 }} />
    </View>
  );
}

function ContenidoApp() {
  const { cargando, cerrandoSesion } = useContext(ContextoUsuario);

  if (cargando || cerrandoSesion) {
    return <PantallaCargaSesion />;
  }

  return <NavegadorPrincipal />;
}

export default function App() {
  return (
    <ProveedorUsuario>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondo} />
      <ContenidoApp />
    </ProveedorUsuario>
  );
}

const estilos = StyleSheet.create({
  carga: {
    flex: 1,
    backgroundColor: colores.fondo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circulo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colores.fondoElevado,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colores.borde,
  },
  panda: {
    fontSize: 48,
  },
});
