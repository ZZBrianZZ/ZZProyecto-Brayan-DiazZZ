import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { colores } from '../tema/colores';

import { ContextoUsuario } from '../contexto/ContextoUsuario';
import PantallaLogin from '../pantallas/PantallaLogin';
import PantallaRegistro from '../pantallas/PantallaRegistro';
import PantallaLectura from '../pantallas/PantallaLectura';
import NavegadorTabs from './NavegadorTabs';

const Stack = createNativeStackNavigator();
const temaGotico = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colores.acentoTexto,
    background: colores.fondo,
    card: colores.fondoElevado,
    text: colores.textoPrincipal,
    border: colores.borde,
    notification: colores.alerta,
  },
};

export default function NavegadorPrincipal() {
  const { token } = useContext(ContextoUsuario);

  // Al cambiar la sesión se reconstruye la navegación para evitar volver a pantallas privadas.
  return (
    <NavigationContainer key={token ? 'auth' : 'guest'} theme={temaGotico}>
      <Stack.Navigator initialRouteName={token ? 'MainTabs' : 'Login'}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={PantallaLogin} options={{ headerShown: false }} />
            <Stack.Screen
              name="Registro"
              component={PantallaRegistro}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={NavegadorTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Lectura"
              component={PantallaLectura}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
