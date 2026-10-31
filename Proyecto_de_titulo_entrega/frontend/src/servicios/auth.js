import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CLAVE_TOKEN = 'token_auth';
const esWeb = Platform.OS === 'web';

export const guardarToken = async (token, usuarioId = null) => {
  // Guardar dueño y token en una sola escritura evita asociaciones parciales.
  const valor = JSON.stringify({ token, usuarioId });
  if (esWeb) {
    await AsyncStorage.setItem(CLAVE_TOKEN, valor);
    return;
  }
  await SecureStore.setItemAsync(CLAVE_TOKEN, valor);
};

export const obtenerSesionGuardada = async () => {
  const valor = esWeb
    ? await AsyncStorage.getItem(CLAVE_TOKEN)
    : await SecureStore.getItemAsync(CLAVE_TOKEN);
  if (!valor) return null;
  if (valor.startsWith('{')) return JSON.parse(valor);
  return { token: valor, usuarioId: null }; // Token del formato anterior.
};

export const obtenerToken = async () => (await obtenerSesionGuardada())?.token || null;

export const eliminarToken = async () => {
  if (esWeb) {
    await AsyncStorage.removeItem(CLAVE_TOKEN);
    return;
  }
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
};
