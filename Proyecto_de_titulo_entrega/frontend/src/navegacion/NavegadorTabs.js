import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PantallaInicio from '../pantallas/PantallaInicio';
import PantallaLogros from '../pantallas/PantallaLogros';
import PantallaPerfil from '../pantallas/PantallaPerfil';
import PantallaRanking from '../pantallas/PantallaRanking';
import { colores } from '../tema/colores';
import { View } from 'react-native';

const Tabs = createBottomTabNavigator();

// Iconos minimalistas con texto (más tenues que emojis)
const IconoInicio = ({ color, focused }) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 4,
      backgroundColor: focused ? colores.acentoTenue : 'transparent',
      borderWidth: 1.5,
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 1,
        backgroundColor: color,
      }}
    />
  </View>
);

const IconoLogros = ({ color, focused }) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 4,
      backgroundColor: focused ? colores.acentoTenue : 'transparent',
      borderWidth: 1.5,
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <View
      style={{
        width: 10,
        height: 6,
        borderRadius: 1,
        borderWidth: 1.5,
        borderColor: color,
        borderBottomWidth: 0,
      }}
    />
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        marginTop: -2,
      }}
    />
  </View>
);

const IconoPerfil = ({ color, focused }) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 4,
      backgroundColor: focused ? colores.acentoTenue : 'transparent',
      borderWidth: 1.5,
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: color,
        marginBottom: 1,
      }}
    />
    <View
      style={{
        width: 12,
        height: 5,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        backgroundColor: color,
      }}
    />
  </View>
);

const IconoRanking = ({ color, focused }) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 4,
      backgroundColor: focused ? colores.acentoTenue : 'transparent',
      borderWidth: 1.5,
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
  </View>
);

export default function NavegadorTabs() {
  return (
    <Tabs.Navigator
      screenOptions={() => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colores.fondo, // Mismo color que el fondo de pantalla
          borderTopWidth: 0, // Sin borde visible
          elevation: 0, // Sin sombra en Android
          shadowOpacity: 0, // Sin sombra en iOS
          height: 56,
          position: 'relative', // Reserva espacio y evita tapar contenido
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarActiveTintColor: colores.textoPrincipal, // Blanco apagado, no verde brillante
        tabBarInactiveTintColor: colores.textoDesactivado, // Casi invisible
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.5,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      })}
    >
      <Tabs.Screen
        name="Inicio"
        component={PantallaInicio}
        options={{
          tabBarIcon: IconoInicio,
        }}
      />
      <Tabs.Screen
        name="Logros"
        component={PantallaLogros}
        options={{
          tabBarIcon: IconoLogros,
        }}
      />
      <Tabs.Screen
        name="Perfil"
        component={PantallaPerfil}
        options={{
          tabBarIcon: IconoPerfil,
        }}
      />
      <Tabs.Screen
        name="Ranking"
        component={PantallaRanking}
        options={{
          tabBarIcon: IconoRanking,
        }}
      />
    </Tabs.Navigator>
  );
}
