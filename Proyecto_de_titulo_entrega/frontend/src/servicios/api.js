import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { obtenerToken } from './auth';

let sesionSincronizacion = null;
let alSincronizar = null;
let manejadorSesionInvalida = null;
const MAXIMO_SESIONES_POR_LOTE = 100;
// Cada cuenta mantiene un solo envío activo para evitar sincronizaciones simultáneas.
const trabajos = new Map();
const repetir = new Set();
const bloqueos = new Map();
const claveCola = (id) => `@pending_sync:${id}`;
const claveCartaMuerta = (id) => `@carta_muerta:${id}`;
export const configurarSesionSincronizacion = (sesion, callback = null) => {
  sesionSincronizacion = sesion;
  alSincronizar = callback;
};
export const configurarManejadorSesionInvalida = (manejador) => {
  manejadorSesionInvalida = manejador;
};
// Cada cuenta modifica su cola en orden, incluso después de un fallo anterior.
const serializar = (id, tarea) => {
  const anterior = bloqueos.get(id) || Promise.resolve();
  const actual = anterior
    .catch(() => {})
    .then(tarea)
    .finally(() => {
      if (bloqueos.get(id) === actual) bloqueos.delete(id);
    });
  bloqueos.set(id, actual);
  return actual;
};

const hostWeb = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

const API_URL =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) ||
  Platform.select({
    web: `http://${hostWeb()}:5000/api`,
    android: 'http://10.0.2.2:5000/api',
    default: 'http://localhost:5000/api',
  });

const fetchConToken = async (endpoint, opciones = {}) => {
  const { tokenSesion, ...opcionesFetch } = opciones;
  const token = tokenSesion === undefined ? await obtenerToken() : tokenSesion;
  const headers = {
    'Content-Type': 'application/json',
    ...opciones.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, { ...opcionesFetch, headers });
    // El 401 de login/registro describe credenciales, no una sesión activa.
    if (res.status === 401 && !endpoint.startsWith('/auth/') && manejadorSesionInvalida) {
      void manejadorSesionInvalida();
    }
    return res;
  } catch (error) {
    throw new Error(
      'No se pudo conectar con el servidor. Abre el backend (carpeta backend, npm run dev) y recarga.',
    );
  }
};

export const obtenerLecturas = async () => {
  const res = await fetchConToken('/lecturas');
  if (!res.ok) throw new Error('No se pudo obtener el catálogo. Intenta nuevamente.');
  const lecturas = await res.json();
  if (!Array.isArray(lecturas)) throw new Error('Catálogo inválido');
  return lecturas.map((lectura) => ({
    ...lectura,
    id: lectura.id || lectura._id || lectura.clave,
  }));
};

export const login = async (email, password) => {
  const res = await fetchConToken('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || 'Error al iniciar sesión');
  return data;
};

export const registro = async (nombre, email, password) => {
  const res = await fetchConToken('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || 'Error al registrar');
  return data;
};

export const obtenerPerfil = async (tokenSesion) => {
  const res = await fetchConToken('/usuarios/perfil', { tokenSesion });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.mensaje || 'Error al obtener perfil');
    error.status = res.status;
    throw error;
  }
  return data;
};

export const actualizarPerfil = async (datos, tokenSesion) => {
  const res = await fetchConToken('/usuarios/perfil', {
    tokenSesion,
    method: 'PUT',
    body: JSON.stringify(datos),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || 'Error al actualizar perfil');
  return data;
};

export const obtenerRanking = async () => {
  const res = await fetchConToken('/usuarios/ranking');
  if (!res.ok) throw new Error('No se pudo obtener el ranking. Intenta nuevamente.');
  const ranking = await res.json();
  if (!Array.isArray(ranking)) throw new Error('Respuesta de ranking inválida');
  return ranking;
};

export const obtenerPendientes = async (id) =>
  JSON.parse((await AsyncStorage.getItem(claveCola(id))) || '[]');

export const obtenerCartaMuerta = async (id) =>
  JSON.parse((await AsyncStorage.getItem(claveCartaMuerta(id))) || '[]');

const aparcarEnCartaMuerta = (id, entradas) =>
  serializar(id, async () => {
    const previas = await obtenerCartaMuerta(id);
    const unicas = new Map([...previas, ...entradas].map((s) => [s.sesionId, s]));
    await AsyncStorage.setItem(claveCartaMuerta(id), JSON.stringify([...unicas.values()]));
  });

export const agregarACola = (sesiones, sesion = sesionSincronizacion) => {
  if (!sesion?.id) return Promise.reject(new Error('No hay sesión activa'));
  return serializar(sesion.id, async () => {
    const cola = await obtenerPendientes(sesion.id);
    const unicas = new Map([...cola, ...sesiones].map((s) => [s.sesionId, s]));
    await AsyncStorage.setItem(claveCola(sesion.id), JSON.stringify([...unicas.values()]));
  });
};

// El bloqueo protege también las entradas agregadas mientras una petición estaba en curso.
const quitarSesionesDeCola = (usuarioId, identificadores) =>
  serializar(usuarioId, async () => {
    const pendientes = await obtenerPendientes(usuarioId);
    await AsyncStorage.setItem(
      claveCola(usuarioId),
      JSON.stringify(pendientes.filter((lectura) => !identificadores.has(lectura.sesionId))),
    );
  });

export const sincronizarHistorial = async (sesiones, sesion = sesionSincronizacion) => {
  await agregarACola(sesiones, sesion);
  return sincronizarColaPendiente(sesion);
};

// Reintenta sin perder sesiones; solo retira las que el servidor confirma.
export const sincronizarColaPendiente = (sesion = sesionSincronizacion) => {
  if (!sesion?.id || !sesion.token) return Promise.resolve();
  if (trabajos.has(sesion.id)) {
    repetir.add(sesion.id);
    return trabajos.get(sesion.id);
  }
  const trabajo = (async () => {
    try {
      const info = await NetInfo.fetch();
      if (!info.isConnected) return;
      // Tras un 400 se envía de a uno para aislar la entrada inválida sin bloquear la cola.
      let aislar = false;
      while (sesionSincronizacion === sesion) {
        const cola = await obtenerPendientes(sesion.id);
        if (!cola.length) break;
        const lote = cola.slice(0, aislar ? 1 : MAXIMO_SESIONES_POR_LOTE);
        const res = await fetchConToken('/usuarios/sincronizar', {
          tokenSesion: sesion.token,
          method: 'POST',
          body: JSON.stringify({ sesiones: lote }),
        });
        if (res.status === 400) {
          if (lote.length > 1) {
            aislar = true;
            continue;
          }
          // Una sesión que el servidor rechaza ya no podrá enviarse: se aparta, no se pierde.
          await aparcarEnCartaMuerta(sesion.id, lote);
          await quitarSesionesDeCola(sesion.id, new Set([lote[0].sesionId]));
          continue;
        }
        if (!res.ok) return; // Conservar pendientes también ante 401/500.
        const data = await res.json();
        const confirmadas = new Set(data.sesionesConfirmadas || []);
        if (!lote.every((s) => confirmadas.has(s.sesionId))) return;
        await quitarSesionesDeCola(sesion.id, confirmadas);
      }
      if (sesionSincronizacion === sesion && alSincronizar) await alSincronizar();
    } catch (error) {
      if (__DEV__) console.error('Sincronización pendiente:', error);
    }
  })().finally(() => {
    trabajos.delete(sesion.id);
    if (repetir.delete(sesion.id) && sesionSincronizacion?.id === sesion.id)
      void sincronizarColaPendiente(sesionSincronizacion);
  });
  trabajos.set(sesion.id, trabajo);
  return trabajo;
};

let cancelarSuscripcionRed = null;

export const iniciarEscuchandoRed = () => {
  if (cancelarSuscripcionRed) return;
  cancelarSuscripcionRed = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      sincronizarColaPendiente();
    }
  });
};

export const detenerEscuchandoRed = () => {
  if (cancelarSuscripcionRed) {
    cancelarSuscripcionRed();
    cancelarSuscripcionRed = null;
  }
};
