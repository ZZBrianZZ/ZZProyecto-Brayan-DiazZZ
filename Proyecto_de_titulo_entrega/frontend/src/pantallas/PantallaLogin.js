import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colores } from '../tema/colores';
import { ContextoUsuario } from '../contexto/ContextoUsuario';
import { mostrarAlerta } from '../servicios/confirmacion';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PantallaLogin({ navigation }) {
  const { login } = useContext(ContextoUsuario);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarIngreso = async () => {
    if (!correo.trim() || !clave.trim()) {
      mostrarAlerta('Error', 'Todos los campos son obligatorios');
      return;
    }

    if (!REGEX_EMAIL.test(correo.trim())) {
      mostrarAlerta('Error', 'El correo no tiene un formato válido');
      return;
    }

    setCargando(true);
    try {
      await login(correo.trim(), clave);
    } catch (error) {
      mostrarAlerta('Error', error.message || 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Bienestar Digital</Text>
      <Text style={estilos.subtitulo}>Lectura consciente y desconexión</Text>

      <View style={estilos.contenedorInputs}>
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
          placeholder="Contraseña"
          placeholderTextColor={colores.textoSecundario}
          secureTextEntry
          value={clave}
          onChangeText={setClave}
        />
      </View>

      <TouchableOpacity
        style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
        onPress={manejarIngreso}
        disabled={cargando}
      >
        <Text style={estilos.textoBoton}>{cargando ? 'Ingresando...' : 'Ingresar'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
        <Text style={estilos.enlace}>¿No tienes cuenta? Regístrate</Text>
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
