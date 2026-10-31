import React, { useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { colores } from '../tema/colores';
import { ContextoUsuario } from '../contexto/ContextoUsuario';
import { confirmar, mostrarAlerta } from '../servicios/confirmacion';
import TarjetaEstadisticas from '../componentes/TarjetaEstadisticas';
import Boton from '../componentes/Boton';

// Convierte segundos a formato mm:ss para mostrar el tiempo de cada lectura
const formatearTiempo = (totalSegundos) => {
  const mins = Math.floor(totalSegundos / 60);
  const segs = totalSegundos % 60;
  return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
};

export default function PantallaPerfil() {
  const { usuario, reiniciarDatos, cerrarSesion, actualizarPerfil } = useContext(ContextoUsuario);
  const historial = usuario.historial || [];

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario.nombre || '');
  const [correo, setCorreo] = useState(usuario.email || '');
  const [guardando, setGuardando] = useState(false);

  const confirmarReiniciar = async () => {
    const aceptado = await confirmar(
      'Limpiar caché local',
      'Se cerrará la sesión y se limpiará la caché de este dispositivo. Tu progreso en el servidor y las lecturas pendientes se conservarán.',
    );
    if (aceptado) {
      try {
        await reiniciarDatos();
      } catch (error) {
        mostrarAlerta('Error', error.message || 'No se pudo limpiar la caché');
      }
    }
  };

  const confirmarCerrarSesion = async () => {
    const aceptado = await confirmar('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?');
    if (aceptado) {
      try {
        await cerrarSesion();
      } catch (error) {
        mostrarAlerta('Error', error.message || 'No se pudo cerrar sesión');
      }
    }
  };

  const guardarPerfil = async () => {
    if (!nombre.trim()) {
      mostrarAlerta('Error', 'El nombre no puede estar vacío');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      mostrarAlerta('Error', 'El correo no tiene un formato válido');
      return;
    }
    setGuardando(true);
    try {
      await actualizarPerfil({ nombre: nombre.trim(), email: correo.trim() });
      setEditando(false);
      mostrarAlerta('Éxito', 'Perfil actualizado');
    } catch (error) {
      mostrarAlerta('Error', error.message || 'No se pudo guardar el perfil');
    } finally {
      setGuardando(false);
    }
  };

  const cancelarEdicion = () => {
    setNombre(usuario.nombre || '');
    setCorreo(usuario.email || '');
    setEditando(false);
  };

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ padding: 20 }}>
      <View style={estilos.tarjetaUsuario}>
        <View style={estilos.avatar}>
          <Text style={estilos.textoAvatar}>
            {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>

        {editando ? (
          <>
            <TextInput
              style={estilos.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre"
              placeholderTextColor={colores.textoDesactivado}
            />
            <TextInput
              style={estilos.input}
              value={correo}
              onChangeText={setCorreo}
              placeholder="Correo electrónico"
              placeholderTextColor={colores.textoDesactivado}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={estilos.filaBotones}>
              <Boton
                titulo="Guardar"
                tipo="primario"
                onPress={guardarPerfil}
                deshabilitado={guardando}
                estilo={{ flex: 1 }}
              />
              <Boton
                titulo="Cancelar"
                tipo="secundario"
                onPress={cancelarEdicion}
                estilo={{ flex: 1 }}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={estilos.nombre}>{usuario.nombre}</Text>
            <Text style={estilos.correo}>{usuario.email || 'usuario@ejemplo.com'}</Text>
            <Boton titulo="Editar perfil" tipo="secundario" onPress={() => setEditando(true)} />
          </>
        )}
      </View>

      <Text style={estilos.tituloSeccion}>Resumen de Progreso</Text>
      <TarjetaEstadisticas nivel={usuario.nivel} racha={usuario.rachaDias} xp={usuario.puntos} />

      <Text style={estilos.tituloSeccion}>Lecturas Recientes</Text>
      {historial.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.textoVacio}>Aún no has completado lecturas</Text>
          <Text style={estilos.textoVacioSecundario}>
            Vuelve al inicio y elige tu primera lectura
          </Text>
        </View>
      ) : (
        historial.slice(0, 5).map((item) => (
          <View key={item.sesionId || item.id} style={estilos.filaHistorial}>
            <View style={estilos.contenidoHistorial}>
              <Text style={estilos.tituloHistorial}>{item.titulo}</Text>
              <Text style={estilos.metaHistorial}>
                {item.fecha} · {formatearTiempo(item.segundos)}
              </Text>
            </View>
            <Text style={estilos.xpHistorial}>+{item.xp} XP</Text>
          </View>
        ))
      )}

      <Text style={estilos.tituloSeccion}>Cuenta</Text>
      <Boton titulo="Cerrar sesión" tipo="secundario" onPress={confirmarCerrarSesion} />

      <Text style={estilos.tituloSeccion}>Configuración y Desarrollo</Text>
      <Boton titulo="Limpiar caché local" tipo="peligro" onPress={confirmarReiniciar} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  tarjetaUsuario: {
    alignItems: 'center',
    backgroundColor: colores.fondoElevado,
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colores.acento,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  textoAvatar: { fontSize: 28, fontWeight: '600', color: colores.textoSobreAcento },
  nombre: { fontSize: 20, fontWeight: '600', color: colores.textoPrincipal },
  correo: { fontSize: 14, color: colores.textoSecundario, marginTop: 4 },
  input: {
    width: '100%',
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colores.textoPrincipal,
    marginBottom: 10,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: '600',
    color: colores.textoPrincipal,
    marginBottom: 10,
    marginTop: 8,
  },
  vacio: {
    backgroundColor: colores.fondoElevado,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    marginBottom: 16,
  },
  textoVacio: { fontSize: 14, color: colores.textoSecundario, fontWeight: '500' },
  textoVacioSecundario: { fontSize: 12, color: colores.textoDesactivado, marginTop: 4 },
  filaHistorial: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colores.fondoElevado,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  contenidoHistorial: { flex: 1, marginRight: 8 },
  tituloHistorial: {
    fontSize: 14,
    fontWeight: '500',
    color: colores.textoPrincipal,
  },
  metaHistorial: {
    fontSize: 12,
    color: colores.textoSecundario,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  xpHistorial: {
    fontSize: 13,
    fontWeight: '600',
    color: colores.acentoTexto,
    fontVariant: ['tabular-nums'],
  },
});
