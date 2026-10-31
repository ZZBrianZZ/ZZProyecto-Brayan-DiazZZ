import React, { createContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcularNivel, actualizarRacha, XP_POR_LECTURA } from '../servicios/gamificacion';
import { guardarToken, obtenerSesionGuardada, eliminarToken } from '../servicios/auth';
import {
  login as loginAPI,
  registro as registroAPI,
  obtenerPerfil,
  actualizarPerfil as actualizarPerfilAPI,
  iniciarEscuchandoRed,
  detenerEscuchandoRed,
  sincronizarColaPendiente,
  configurarSesionSincronizacion,
  agregarACola,
  obtenerPendientes,
  configurarManejadorSesionInvalida,
} from '../servicios/api';
import { mostrarAlerta } from '../servicios/confirmacion';

export const ContextoUsuario = createContext();
const CLAVE_SESION = '@sesion_usuario';
const clavePerfil = (id) => `@usuario_perfil:${id}`;
const unirHistorial = (...listas) =>
  [...new Map(listas.flat().map((h) => [h.sesionId || h.id, h])).values()].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );

// Incorpora solo las sesiones que aún no están reflejadas en el perfil recibido.
// Se usa tanto al restaurar la caché como al recibir el progreso del servidor.
const incorporarProgresoPendiente = (perfil, pendientes) => {
  const identificadoresGuardados = new Set(
    (perfil.historial || []).map((lectura) => lectura.sesionId),
  );
  const faltantes = pendientes.filter((lectura) => !identificadoresGuardados.has(lectura.sesionId));
  let racha = perfil.rachaDias;
  let ultimaFecha = perfil.ultimaFechaLectura?.slice(0, 10) || null;
  for (const lectura of [...faltantes].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    racha = actualizarRacha(racha, ultimaFecha, lectura.fecha);
    if (!ultimaFecha || lectura.fecha > ultimaFecha) ultimaFecha = lectura.fecha;
  }
  const puntos = perfil.puntos + faltantes.length * XP_POR_LECTURA;
  return {
    ...perfil,
    puntos,
    nivel: calcularNivel(puntos),
    rachaDias: racha,
    ultimaFechaLectura: ultimaFecha,
  };
};

export const ProveedorUsuario = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const sesionRef = useRef(null);
  const usuarioRef = useRef(null);
  const operaciones = useRef(Promise.resolve());
  // Serializa los cambios locales para que dos lecturas no sobrescriban el mismo perfil.
  const enOrden = (tarea) => {
    const siguiente = operaciones.current.catch(() => {}).then(tarea);
    operaciones.current = siguiente;
    return siguiente;
  };

  // Una respuesta tardía de otra cuenta puede guardarse en caché, pero no cambiar la pantalla.
  const guardarPerfilLocal = async (perfil, sesion) => {
    await AsyncStorage.setItem(clavePerfil(sesion.id), JSON.stringify(perfil));
    if (sesionRef.current !== sesion) return;
    usuarioRef.current = perfil;
    setUsuario(perfil);
  };

  const aplicarPerfilServidor = async (perfil, sesion) => {
    const local = JSON.parse((await AsyncStorage.getItem(clavePerfil(sesion.id))) || 'null');
    const pendientes = await obtenerPendientes(sesion.id);
    await guardarPerfilLocal(
      {
        ...incorporarProgresoPendiente(perfil, pendientes),
        historial: unirHistorial(local?.historial || [], pendientes, perfil.historial || []),
      },
      sesion,
    );
  };

  const activarSesion = async (sesion, perfil, desdeCache = false) => {
    sesionRef.current = sesion;
    if (desdeCache) {
      const pendientes = await obtenerPendientes(sesion.id);
      await guardarPerfilLocal(
        {
          ...incorporarProgresoPendiente(perfil, pendientes),
          historial: unirHistorial(perfil.historial || [], pendientes),
        },
        sesion,
      );
    } else await aplicarPerfilServidor(perfil, sesion);
    configurarSesionSincronizacion(sesion, () =>
      enOrden(async () => {
        const actualizado = await obtenerPerfil(sesion.token);
        if (sesionRef.current === sesion) await aplicarPerfilServidor(actualizado, sesion);
      }),
    );
    setToken(sesion.token);
    void sincronizarColaPendiente(sesion);
  };

  const manejarSesionInvalida = () => {
    if (!sesionRef.current) return; // Sin sesión activa lo resuelve el arranque o el login.
    sesionRef.current = null; // Evita doble aviso si llegan varios 401 en paralelo.
    void cerrarSesion()
      .catch(() => {})
      .then(() =>
        mostrarAlerta('Sesión expirada', 'Tu sesión ya no es válida. Inicia sesión de nuevo.'),
      );
  };

  useEffect(() => {
    iniciarEscuchandoRed();
    configurarManejadorSesionInvalida(manejarSesionInvalida);
    const cargar = async () => {
      try {
        const credencial = await obtenerSesionGuardada();
        if (!credencial?.token) return;
        const guardado = credencial.token;
        const id = credencial.usuarioId;
        try {
          const perfil = await obtenerPerfil(guardado);
          const sesion = { id: String(perfil.id), token: guardado };
          await guardarToken(guardado, sesion.id);
          await activarSesion(sesion, perfil);
        } catch (error) {
          if (error.status === 401 || error.status === 404) {
            await eliminarToken();
            await AsyncStorage.removeItem(CLAVE_SESION);
          } else if (id) {
            const cache = JSON.parse((await AsyncStorage.getItem(clavePerfil(id))) || 'null');
            if (cache) await activarSesion({ id, token: guardado }, cache, true);
          }
          // Una caída de red no elimina una sesión válida.
        }
      } catch (error) {
        if (__DEV__) console.error('Error cargando sesión:', error);
      } finally {
        setCargando(false);
      }
    };
    void cargar();
    return () => {
      detenerEscuchandoRed();
      configurarSesionSincronizacion(null);
      configurarManejadorSesionInvalida(null);
    };
  }, []);

  const autenticar = async (peticion) => {
    const data = await peticion();
    const perfil = await obtenerPerfil(data.token);
    const sesion = { id: String(data.usuario.id), token: data.token };
    await guardarToken(data.token, sesion.id);
    await activarSesion(sesion, perfil);
    return data;
  };
  const login = (email, password) => autenticar(() => loginAPI(email, password));
  const registro = (nombre, email, password) =>
    autenticar(() => registroAPI(nombre, email, password));

  const completarLectura = (_puntos, datos = {}) => {
    const sesion = sesionRef.current;
    return enOrden(async () => {
      if (!sesion || sesionRef.current !== sesion)
        throw new Error('Inicia sesión para guardar la lectura');
      const perfilAnterior = usuarioRef.current;
      if (datos.sesionId && perfilAnterior.historial?.some((h) => h.sesionId === datos.sesionId)) {
        void sincronizarColaPendiente(sesion);
        return;
      }
      const hoy = new Date().toISOString().slice(0, 10);
      const entrada = {
        sesionId:
          datos.sesionId ||
          `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`,
        titulo: datos.titulo || 'Lectura completada',
        fecha: hoy,
        segundos: datos.tiempoSegundos || 0,
        xp: XP_POR_LECTURA,
      };
      // La cola persiste antes de conceder puntos en pantalla.
      await agregarACola([entrada], sesion);
      const puntos = perfilAnterior.puntos + XP_POR_LECTURA;
      await guardarPerfilLocal(
        {
          ...perfilAnterior,
          puntos,
          nivel: calcularNivel(puntos),
          rachaDias: actualizarRacha(
            perfilAnterior.rachaDias,
            perfilAnterior.ultimaFechaLectura,
            hoy,
          ),
          ultimaFechaLectura: hoy,
          historial: unirHistorial(perfilAnterior.historial || [], [entrada]),
        },
        sesion,
      );
      void sincronizarColaPendiente(sesion);
    });
  };

  const cerrarSesion = async () => {
    setCerrandoSesion(true);
    try {
      await eliminarToken();
      configurarSesionSincronizacion(null);
      sesionRef.current = null;
      usuarioRef.current = null;
      setToken(null);
      setUsuario(null);
      await AsyncStorage.removeItem(CLAVE_SESION);
    } finally {
      setCerrandoSesion(false);
    }
  };
  const reiniciarDatos = async () => {
    const id = sesionRef.current?.id;
    await cerrarSesion();
    await operaciones.current.catch(() => {});
    if (id) await AsyncStorage.removeItem(clavePerfil(id));
    // Conservar la cola: limpiar caché no debe borrar lecturas pendientes.
  };
  const actualizarPerfil = (datos) => {
    const sesion = sesionRef.current;
    return enOrden(async () => {
      if (!sesion || sesionRef.current !== sesion)
        throw new Error('Inicia sesión para editar el perfil');
      const data = await actualizarPerfilAPI(datos, sesion.token);
      if (sesionRef.current === sesion) {
        await guardarPerfilLocal(
          { ...usuarioRef.current, nombre: data.nombre, email: data.email },
          sesion,
        );
      }
      return data;
    });
  };

  return (
    <ContextoUsuario.Provider
      value={{
        usuario,
        token,
        login,
        registro,
        completarLectura,
        reiniciarDatos,
        cerrarSesion,
        cerrandoSesion,
        actualizarPerfil,
        cargando,
      }}
    >
      {children}
    </ContextoUsuario.Provider>
  );
};
