import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colores } from '../tema/colores';
import { ContextoUsuario } from '../contexto/ContextoUsuario';
import { mostrarAlerta } from '../servicios/confirmacion';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validarContrasena = (clave) => {
  if (clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(clave)) return 'Debe contener al menos una mayúscula';
  if (!/[0-9]/.test(clave)) return 'Debe contener al menos un número';
  return null;
};

export default function PantallaRegistro({ navigation }) {
  const { registro } = useContext(ContextoUsuario);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [cargando, setCargando] = useState(false);

  // La validación local orienta al usuario; el servidor vuelve a validar antes de guardar.
  const manejarRegistro = async () => {
    if (!nombre.trim() || !correo.trim() || !clave.trim()) {
      mostrarAlerta('Error', 'Todos los campos son obligatorios');
      return;
    }

    if (!REGEX_EMAIL.test(correo.trim())) {
      mostrarAlerta('Error', 'El correo no tiene un formato válido');
      return;
    }

    const errorClave = validarContrasena(clave);
    if (errorClave) {
      mostrarAlerta('Error', errorClave);
      return;
    }

    if (clave !== confirmarClave) {
      mostrarAlerta('Error', 'Las contraseñas no coinciden');
      return;
    }

    setCargando(true);
    try {
      await registro(nombre.trim(), correo.trim(), clave);
    } catch (error) {
      mostrarAlerta('Error', error.message || 'No se pudo crear la cuenta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Crear Cuenta</Text>
      <Text style={estilos.subtitulo}>Comienza tu viaje de lectura consciente</Text>

      <View style={estilos.contenedorInputs}>
        <TextInput
          style={estilos.input}
          placeholder="Nombre"
          placeholderTextColor={colores.textoSecundario}
          value={nombre}
          onChangeText={setNombre}
        />
        <TextInput
          style={estilos.input}
          placeholder="Correo electrónico"
          placeholderTextColor={colores.textoSecundario}
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={estilos.input}
          placeholder="Contraseña (mín. 8 caracteres, 1 mayúscula, 1 número)"
          placeholderTextColor={colores.textoSecundario}
          secureTextEntry
          value={clave}
          onChangeText={setClave}
        />
        <TextInput
          style={estilos.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor={colores.textoSecundario}
          secureTextEntry
          value={confirmarClave}
          onChangeText={setConfirmarClave}
        />
      </View>

      <TouchableOpacity
        style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
        onPress={manejarRegistro}
        disabled={cargando}
      >
        <Text style={estilos.textoBoton}>{cargando ? 'Creando...' : 'Crear cuenta'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={estilos.enlace}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: colores.textoPrincipal, textAlign: 'center' },
  subtitulo: {
    fontSize: 14,
    color: colores.textoSecundario,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  contenedorInputs: { gap: 12, marginBottom: 24 },
  input: {
    backgroundColor: colores.fondoElevado,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colores.textoPrincipal,
  },
  boton: {
    backgroundColor: colores.acento,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: colores.textoSobreAcento, fontSize: 16, fontWeight: '600' },
  enlace: { color: colores.acentoTexto, textAlign: 'center', marginTop: 16, fontSize: 14 },
});
