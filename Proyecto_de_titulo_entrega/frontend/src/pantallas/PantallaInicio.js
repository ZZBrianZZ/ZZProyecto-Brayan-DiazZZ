import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colores } from '../tema/colores';
import { obtenerLecturas } from '../servicios/api';
import { ContextoUsuario } from '../contexto/ContextoUsuario';
import TarjetaEstadisticas from '../componentes/TarjetaEstadisticas';
import TarjetaLectura from '../componentes/TarjetaLectura';

export default function PantallaInicio({ navigation }) {
  // Lee el usuario global para mostrar nombre y estadísticas en tiempo real
  const { usuario } = useContext(ContextoUsuario);
  // Catálogo del backend.
  const [lecturas, setLecturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerLecturas();
      setLecturas(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  // Al abrir la pantalla cargamos el catálogo desde la capa de datos
  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={colores.acentoTexto || colores.acento} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.textoError}>{error}</Text>
        <TouchableOpacity style={estilos.botonReintentar} onPress={cargar}>
          <Text style={estilos.textoReintentar}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!lecturas.length) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.textoVacio}>Aún no hay lecturas disponibles</Text>
        <Text style={estilos.textoVacioSecundario}>Vuelve a intentarlo más tarde</Text>
      </View>
    );
  }

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ padding: 20 }}>
      {/* Cabecera con saludo y botón al perfil */}
      <View style={estilos.cabecera}>
        <View>
          <Text style={estilos.saludo}>Hola, {usuario.nombre}</Text>
          <Text style={estilos.subsaludo}>Tu espacio de calma diario</Text>
        </View>
        <TouchableOpacity style={estilos.botonPerfil} onPress={() => navigation.navigate('Perfil')}>
          <Text style={estilos.iconoPerfil}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Estadísticas de Gamificación */}
      <TarjetaEstadisticas nivel={usuario.nivel} racha={usuario.rachaDias} xp={usuario.puntos} />

      {/* Lista de Lecturas */}
      <Text style={estilos.tituloSeccion}>Lectura Consciente Sugerida</Text>

      {/* Recorre el catálogo y navega a la pantalla de lectura con la lectura seleccionada */}
      {lecturas.map((item) => (
        <TarjetaLectura
          key={item.id || item._id || item.clave}
          titulo={item.titulo}
          categoria={item.categoria}
          tiempo={item.tiempoEstimado}
          onPress={() => navigation.navigate('Lectura', { lectura: item })}
        />
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: {
    flex: 1,
    backgroundColor: colores.fondo,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textoError: {
    fontSize: 15,
    color: colores.textoSecundario,
    textAlign: 'center',
    marginBottom: 16,
  },
  botonReintentar: {
    backgroundColor: colores.acentoSuave,
    borderWidth: 1,
    borderColor: colores.acento,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  textoReintentar: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.acentoTexto,
  },
  textoVacio: {
    fontSize: 16,
    fontWeight: '600',
    color: colores.textoPrincipal,
    textAlign: 'center',
  },
  textoVacioSecundario: {
    fontSize: 13,
    color: colores.textoSecundario,
    textAlign: 'center',
    marginTop: 6,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  saludo: { fontSize: 24, fontWeight: '600', color: colores.textoPrincipal },
  subsaludo: { fontSize: 14, color: colores.textoSecundario, marginTop: 2 },
  botonPerfil: {
    backgroundColor: colores.fondoElevado,
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  iconoPerfil: { fontSize: 18 },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: '600',
    color: colores.textoPrincipal,
    marginBottom: 4,
    marginTop: 12,
  },
});
