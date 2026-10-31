// Pruebas de lógica con almacenamiento/red simulados; no requieren Expo ni Atlas.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const raizFrontend = path.resolve(__dirname, '../../frontend');
const requireFrontend = createRequire(path.join(raizFrontend, 'package.json'));
const babel = requireFrontend('@babel/core');
const cargar = (archivo, mocks, globales = {}) => {
  const codigo = babel.transformSync(
    fs.readFileSync(path.join(raizFrontend, 'src', archivo), 'utf8'),
    {
      babelrc: false,
      configFile: false,
      plugins: [
        requireFrontend('@babel/plugin-transform-modules-commonjs'),
        requireFrontend('@babel/plugin-transform-react-jsx'),
      ],
    },
  ).code;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    __DEV__: false,
    console,
    require: (nombre) => {
      if (!(nombre in mocks)) throw new Error(`Mock faltante: ${nombre}`);
      return mocks[nombre];
    },
    ...globales,
  });
  return exports;
};
const almacenamiento = () => {
  const valores = new Map();
  return {
    valores,
    getItem: jest.fn(async (k) => valores.get(k) || null),
    setItem: jest.fn(async (k, v) => {
      valores.set(k, v);
    }),
    removeItem: jest.fn(async (k) => {
      valores.delete(k);
    }),
  };
};
const esperar = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const diferido = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

test('token y propietario se guardan juntos y se recuperan sin mezclar cuentas', async () => {
  const storage = almacenamiento();
  const auth = cargar('servicios/auth.js', {
    'react-native': { Platform: { OS: 'web' } },
    '@react-native-async-storage/async-storage': storage,
    'expo-secure-store': {},
  });
  await auth.guardarToken('token-A', 'A');
  storage.setItem.mockRejectedValueOnce(new Error('sin espacio'));
  await expect(auth.guardarToken('token-B', 'B')).rejects.toThrow('sin espacio');
  expect(await auth.obtenerSesionGuardada()).toEqual({ token: 'token-A', usuarioId: 'A' });
  expect(await auth.obtenerToken()).toBe('token-A');
});

test('los tokens anteriores siguen siendo legibles sin inventar un propietario', async () => {
  const storage = almacenamiento();
  storage.valores.set('token_auth', 'jwt-anterior');
  const auth = cargar('servicios/auth.js', {
    'react-native': { Platform: { OS: 'web' } },
    '@react-native-async-storage/async-storage': storage,
    'expo-secure-store': {},
  });
  expect(await auth.obtenerSesionGuardada()).toEqual({ token: 'jwt-anterior', usuarioId: null });
});

describe('cola offline por cuenta', () => {
  let storage, api, fetch, red;
  const A = { id: 'A', token: 'token-A' };
  const B = { id: 'B', token: 'token-B' };
  const entrada = { sesionId: 'sesion_001', titulo: 'Lectura', fecha: '2026-01-01', segundos: 20 };
  beforeEach(() => {
    storage = almacenamiento();
    red = { fetch: jest.fn(async () => ({ isConnected: true })), addEventListener: jest.fn() };
    fetch = jest.fn(async (_url, opciones) => ({
      ok: true,
      json: async () => ({
        sesionesConfirmadas: JSON.parse(opciones.body).sesiones.map((s) => s.sesionId),
      }),
    }));
    api = cargar(
      'servicios/api.js',
      {
        'react-native': { Platform: { select: (v) => v.android } },
        '@react-native-async-storage/async-storage': storage,
        '@react-native-community/netinfo': red,
        './datosPrueba': { lecturasPrueba: [] },
        './auth': { obtenerToken: async () => 'token-no-usar' },
      },
      { fetch },
    );
  });
  test('el catálogo normaliza los identificadores recibidos de MongoDB', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ _id: 'lectura-A', titulo: 'Lectura' }],
    });
    expect((await api.obtenerLecturas())[0].id).toBe('lectura-A');
  });
  test('un fallo de ranking permite mostrar error y reintentar', async () => {
    fetch.mockRejectedValueOnce(new Error('sin red'));
    await expect(api.obtenerRanking()).rejects.toThrow('conectar');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    expect(await api.obtenerRanking()).toEqual([]);
  });
  test('la edición usa el token capturado y no el de otra cuenta', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ nombre: 'Ana' }) });
    await api.actualizarPerfil({ nombre: 'Ana' }, 'token-A');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-A');
  });
  test('iniciar dos veces la escucha de red no duplica suscripciones', () => {
    red.addEventListener.mockReturnValue(jest.fn());
    api.iniciarEscuchandoRed();
    api.iniciarEscuchandoRed();
    expect(red.addEventListener).toHaveBeenCalledTimes(1);
  });
  test('B no recibe la cola ni el historial global antiguo de A', async () => {
    storage.valores.set('@pending_sync', JSON.stringify([entrada]));
    await api.agregarACola([entrada], A);
    api.configurarSesionSincronizacion(B);
    await api.sincronizarColaPendiente();
    expect(fetch).not.toHaveBeenCalled();
    expect(await api.obtenerPendientes('A')).toHaveLength(1);
    expect(storage.valores.has('@pending_sync')).toBe(true);
  });
  test('una petición en vuelo mantiene el token y la cola de su propietario', async () => {
    const puerta = diferido();
    fetch.mockImplementationOnce(async (_url, opciones) => {
      await puerta.promise;
      return { ok: true, json: async () => ({ sesionesConfirmadas: [entrada.sesionId] }) };
    });
    api.configurarSesionSincronizacion(A);
    await api.agregarACola([entrada], A);
    const envio = api.sincronizarColaPendiente();
    await esperar();
    api.configurarSesionSincronizacion(B);
    await api.agregarACola([{ ...entrada, sesionId: 'sesion_B01' }], B);
    puerta.resolve();
    await envio;
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-A');
    expect(await api.obtenerPendientes('B')).toHaveLength(1);
    expect(await api.obtenerPendientes('A')).toHaveLength(0);
  });
  test('un fallo conserva el mismo identificador para el reintento', async () => {
    api.configurarSesionSincronizacion(A);
    fetch.mockRejectedValueOnce(new Error('respuesta perdida'));
    await api.sincronizarHistorial([entrada]);
    expect(await api.obtenerPendientes('A')).toHaveLength(1);
    await api.sincronizarColaPendiente();
    expect(JSON.parse(fetch.mock.calls[1][1].body).sesiones[0].sesionId).toBe(entrada.sesionId);
    expect(await api.obtenerPendientes('A')).toHaveLength(0);
  });
  test('encolados simultáneos no se pisan', async () => {
    await Promise.all([
      api.agregarACola([entrada], A),
      api.agregarACola([{ ...entrada, sesionId: 'sesion_002' }], A),
    ]);
    expect(await api.obtenerPendientes('A')).toHaveLength(2);
  });
  test('una lectura añadida durante el envío no se elimina con el lote anterior', async () => {
    const puerta = diferido();
    fetch.mockImplementationOnce(async () => {
      await puerta.promise;
      return { ok: true, json: async () => ({ sesionesConfirmadas: [entrada.sesionId] }) };
    });
    api.configurarSesionSincronizacion(A);
    await api.agregarACola([entrada], A);
    const envio = api.sincronizarColaPendiente();
    await esperar();
    await api.agregarACola([{ ...entrada, sesionId: 'sesion_002' }], A);
    puerta.resolve();
    await envio;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body).sesiones[0].sesionId).toBe('sesion_002');
  });
  test('una entrada rechazada con 400 va a la carta muerta y no bloquea la cola', async () => {
    api.configurarSesionSincronizacion(A);
    await api.agregarACola([entrada], A);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ mensaje: 'Sesión inválida' }),
    });
    await api.sincronizarColaPendiente();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await api.obtenerPendientes('A')).toHaveLength(0);
    const muerta = await api.obtenerCartaMuerta('A');
    expect(muerta.map((s) => s.sesionId)).toEqual([entrada.sesionId]);
  });
  test('un lote completo rechazado se aísla hasta dejar pasar las lecturas válidas', async () => {
    const buena = { ...entrada, sesionId: 'sesion_buena' };
    api.configurarSesionSincronizacion(A);
    await api.agregarACola([entrada, buena], A);
    fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ mensaje: 'Lote inválido' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ mensaje: 'Sesión inválida' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sesionesConfirmadas: ['sesion_buena'] }),
      });
    await api.sincronizarColaPendiente();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetch.mock.calls[1][1].body).sesiones).toHaveLength(1);
    expect(await api.obtenerPendientes('A')).toHaveLength(0);
    expect((await api.obtenerCartaMuerta('A')).map((s) => s.sesionId)).toEqual([entrada.sesionId]);
  });
  test('un error del servidor no envía lecturas a la carta muerta', async () => {
    api.configurarSesionSincronizacion(A);
    await api.agregarACola([entrada], A);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ mensaje: 'Error del servidor' }),
    });
    await api.sincronizarColaPendiente();
    expect(await api.obtenerPendientes('A')).toHaveLength(1);
    expect(await api.obtenerCartaMuerta('A')).toHaveLength(0);
  });
  test('el 401 de login describe credenciales y no dispara el cierre de sesión', async () => {
    const manejador = jest.fn();
    api.configurarManejadorSesionInvalida(manejador);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ mensaje: 'Credenciales inválidas' }),
    });
    await expect(api.login('x@y.cl', 'clave')).rejects.toThrow('Credenciales inválidas');
    expect(manejador).not.toHaveBeenCalled();
  });
  test('un 401 en una ruta protegida avisa que la sesión ya no sirve', async () => {
    const manejador = jest.fn();
    api.configurarManejadorSesionInvalida(manejador);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ mensaje: 'Token inválido o expirado' }),
    });
    await expect(api.obtenerRanking()).rejects.toThrow('ranking');
    expect(manejador).toHaveBeenCalledTimes(1);
  });
});

test('el enfoque silencia la presentación y conserva todos los recordatorios', async () => {
  const notifications = {
    setNotificationHandler: jest.fn(),
    cancelAllScheduledNotificationsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
  };
  const servicio = cargar('servicios/notificaciones.js', {
    'expo-notifications': notifications,
    'react-native': { Platform: { OS: 'android' } },
  });
  const salir = servicio.iniciarEnfoqueNotificaciones();
  const handler = notifications.setNotificationHandler.mock.calls[0][0];
  expect((await handler.handleNotification()).shouldPlaySound).toBe(false);
  expect((await handler.handleNotification()).shouldShowBanner).toBe(false);
  salir();
  expect((await handler.handleNotification()).shouldShowBanner).toBe(true);
  expect(notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

describe('estado de sesión y progreso', () => {
  let storage, auth, api, render, iniciar, alertaSesion;
  const perfil = {
    id: 'A',
    nombre: 'Ana',
    puntos: 100,
    nivel: 2,
    rachaDias: 5,
    ultimaFechaLectura: '2026-01-05T00:00:00.000Z',
    historial: [],
  };
  beforeEach(() => {
    storage = almacenamiento();
    alertaSesion = jest.fn();
    auth = {
      obtenerToken: jest.fn(async () => null),
      guardarToken: jest.fn(),
      eliminarToken: jest.fn(),
    };
    auth.obtenerSesionGuardada = jest.fn(async () => ({
      token: await auth.obtenerToken(),
      usuarioId: 'A',
    }));
    api = {
      login: jest.fn(async () => ({ token: 'token-A', usuario: { id: 'A' } })),
      obtenerPerfil: jest.fn(async () => ({ ...perfil })),
      obtenerPendientes: jest.fn(async () => []),
      agregarACola: jest.fn(async () => {}),
      configurarSesionSincronizacion: jest.fn(),
      sincronizarColaPendiente: jest.fn(async () => {}),
      configurarManejadorSesionInvalida: jest.fn(),
      iniciarEscuchandoRed: jest.fn(),
      detenerEscuchandoRed: jest.fn(),
    };
    const estados = [],
      refs = [],
      efectos = [];
    let indiceEstado = 0,
      indiceRef = 0,
      montado = false;
    const react = {
      createContext: () => ({ Provider: 'Provider' }),
      createElement: (_tipo, props) => props,
      useState: (inicial) => {
        const i = indiceEstado++;
        if (!(i in estados)) estados[i] = inicial;
        return [
          estados[i],
          (valor) => {
            estados[i] = valor;
          },
        ];
      },
      useRef: (inicial) => {
        const i = indiceRef++;
        return refs[i] || (refs[i] = { current: inicial });
      },
      useEffect: (fn) => {
        if (!montado) efectos.push(fn);
      },
    };
    const gamificacion = cargar('servicios/gamificacion.js', {});
    const contexto = cargar('contexto/ContextoUsuario.js', {
      react,
      '@react-native-async-storage/async-storage': storage,
      '../servicios/gamificacion': gamificacion,
      '../servicios/auth': auth,
      '../servicios/api': api,
      '../servicios/confirmacion': { mostrarAlerta: alertaSesion },
    });
    render = () => {
      indiceEstado = 0;
      indiceRef = 0;
      const p = contexto.ProveedorUsuario({ children: null });
      montado = true;
      return p.value;
    };
    iniciar = async () => {
      render();
      efectos.forEach((fn) => fn());
      await esperar();
      return render();
    };
  });
  test('una edición en cola no modifica la cuenta que inicia sesión después', async () => {
    await iniciar();
    await render().login('a@a.cl', 'password');
    const puerta = diferido();
    api.agregarACola.mockImplementationOnce(() => puerta.promise);
    const lectura = render().completarLectura(20, {
      sesionId: 'sesion_bloqueada',
      titulo: 'Lectura',
    });
    await esperar();
    api.actualizarPerfil = jest.fn(async () => ({ nombre: 'No aplicar' }));
    const edicion = render().actualizarPerfil({ nombre: 'Cambio de A' });
    const rechazada = expect(edicion).rejects.toThrow('Inicia sesión');
    await render().cerrarSesion();
    api.login.mockResolvedValue({ token: 'token-B', usuario: { id: 'B' } });
    api.obtenerPerfil.mockResolvedValue({ ...perfil, id: 'B', nombre: 'Bea' });
    await render().login('b@b.cl', 'password');
    puerta.resolve();
    await lectura;
    await rechazada;
    expect(api.actualizarPerfil).not.toHaveBeenCalled();
    expect(render().usuario.nombre).toBe('Bea');
  });
  test('cerrar sesión sale de carga y borra el usuario visible', async () => {
    await iniciar();
    await render().login('a@a.cl', 'password');
    expect(render().usuario.nombre).toBe('Ana');
    await render().cerrarSesion();
    expect(render().cerrandoSesion).toBe(false);
    expect(render().token).toBe(null);
    expect(render().usuario).toBe(null);
  });
  test('un fallo al eliminar el token tampoco deja carga permanente', async () => {
    await iniciar();
    auth.eliminarToken.mockRejectedValueOnce(new Error('fallo de almacenamiento'));
    await expect(render().cerrarSesion()).rejects.toThrow('fallo');
    expect(render().cerrandoSesion).toBe(false);
  });
  test('arranque offline conserva token y recupera solo la caché de su cuenta', async () => {
    auth.obtenerToken.mockResolvedValue('token-A');
    storage.valores.set('@sesion_usuario', 'A');
    storage.valores.set('@usuario_perfil:A', JSON.stringify(perfil));
    storage.valores.set('@usuario_historial', JSON.stringify([{ titulo: 'Otra cuenta' }]));
    api.obtenerPerfil.mockRejectedValue(new Error('sin conexión'));
    const estado = await iniciar();
    expect(auth.eliminarToken).not.toHaveBeenCalled();
    expect(estado.token).toBe('token-A');
    expect(estado.usuario.historial).toHaveLength(0);
  });
  test('token inválido sí se elimina', async () => {
    auth.obtenerToken.mockResolvedValue('expirado');
    api.obtenerPerfil.mockRejectedValue(Object.assign(new Error('expirado'), { status: 401 }));
    await iniciar();
    expect(auth.eliminarToken).toHaveBeenCalledTimes(1);
    expect(render().token).toBe(null);
  });
  test('login conserva última fecha y no importa historial de otra cuenta', async () => {
    await iniciar();
    storage.valores.set('@usuario_historial', JSON.stringify([{ titulo: 'Otra cuenta' }]));
    await render().login('a@a.cl', 'password');
    expect(render().usuario.ultimaFechaLectura).toBe('2026-01-05');
    expect(render().usuario.rachaDias).toBe(5);
    expect(render().usuario.historial).toHaveLength(0);
  });
  test('la primera lectura tras login mantiene la racha del mismo día', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    api.obtenerPerfil.mockResolvedValue({ ...perfil, ultimaFechaLectura: `${hoy}T00:00:00.000Z` });
    await iniciar();
    await render().login('a@a.cl', 'password');
    await render().completarLectura(20, { sesionId: 'sesion_hoy', titulo: 'Lectura' });
    expect(render().usuario.rachaDias).toBe(5);
  });
  test('recupera una lectura encolada antes de un cierre inesperado al guardar caché', async () => {
    auth.obtenerToken.mockResolvedValue('token-A');
    storage.valores.set('@sesion_usuario', 'A');
    storage.valores.set('@usuario_perfil:A', JSON.stringify(perfil));
    api.obtenerPerfil.mockRejectedValue(new Error('offline'));
    api.obtenerPendientes.mockResolvedValue([
      { sesionId: 'pendiente_01', fecha: '2026-01-06', titulo: 'Lectura', xp: 20 },
    ]);
    const estado = await iniciar();
    expect(estado.usuario.puntos).toBe(120);
    expect(estado.usuario.rachaDias).toBe(6);
    expect(estado.usuario.historial).toHaveLength(1);
  });
  test('completar dos veces el mismo identificador premia una sola vez', async () => {
    await iniciar();
    await render().login('a@a.cl', 'password');
    const datos = { sesionId: 'sesion_0001', titulo: 'Lectura', tiempoSegundos: 10 };
    await render().completarLectura(99999, datos);
    await render().completarLectura(99999, datos);
    expect(render().usuario.puntos).toBe(120);
    expect(render().usuario.historial).toHaveLength(1);
    expect(api.agregarACola).toHaveBeenCalledTimes(1);
  });
  test('un 401 a mitad de sesión cierra sesión, borra el token y avisa una sola vez', async () => {
    await iniciar();
    await render().login('a@a.cl', 'password');
    const manejador = api.configurarManejadorSesionInvalida.mock.calls[0][0];
    manejador();
    await esperar();
    expect(auth.eliminarToken).toHaveBeenCalled();
    expect(render().token).toBe(null);
    expect(render().usuario).toBe(null);
    expect(alertaSesion).toHaveBeenCalledWith(
      'Sesión expirada',
      expect.stringContaining('Inicia sesión'),
    );
    manejador();
    await esperar();
    expect(alertaSesion).toHaveBeenCalledTimes(1);
  });
});

describe('finalización del cronómetro de lectura', () => {
  let reloj, intervalos, render, completar, alerta, tick;
  beforeEach(() => {
    reloj = 0;
    intervalos = new Map();
    const estados = [],
      refs = [],
      efectos = [];
    let indiceEstado = 0,
      indiceRef = 0,
      montado = false,
      siguienteIntervalo = 0;
    completar = jest.fn(async () => {});
    alerta = jest.fn();
    const react = {
      createElement: (tipo, props, ...children) => ({ tipo, props: props || {}, children }),
      useState: (inicial) => {
        const i = indiceEstado++;
        if (!(i in estados)) estados[i] = inicial;
        return [
          estados[i],
          (valor) => {
            estados[i] = typeof valor === 'function' ? valor(estados[i]) : valor;
          },
        ];
      },
      useRef: (inicial) => {
        const i = indiceRef++;
        return refs[i] || (refs[i] = { current: inicial });
      },
      useEffect: (fn) => {
        if (!montado) efectos.push(fn);
      },
      useContext: () => ({ usuario: { nivel: 1, rachaDias: 1 }, completarLectura: completar }),
      useCallback: (fn) => fn,
    };
    const nativo = Object.fromEntries(
      ['View', 'Text', 'TouchableOpacity', 'ScrollView', 'StatusBar'].map((s) => [s, s]),
    );
    nativo.StyleSheet = { create: (s) => s, absoluteFillObject: {} };
    nativo.Dimensions = { get: () => ({ height: 800 }) };
    const pantalla = cargar(
      'pantallas/PantallaLectura.js',
      {
        react,
        'react-native': nativo,
        '../servicios/gamificacion': { XP_POR_LECTURA: 20 },
        '../servicios/notificaciones': { iniciarEnfoqueNotificaciones: () => () => {} },
        '../servicios/confirmacion': { mostrarAlerta: alerta },
        '../tema/colores': { colores: {} },
        '../contexto/ContextoUsuario': { ContextoUsuario: {} },
        '../componentes/ModalFelicitacion': 'Resumen',
        '../componentes/ImagenLectura': 'ImagenLectura',
      },
      {
        Date: class extends Date {
          static now() {
            return reloj;
          }
        },
        setInterval: (fn) => {
          const id = ++siguienteIntervalo;
          intervalos.set(id, fn);
          return id;
        },
        clearInterval: (id) => intervalos.delete(id),
      },
    ).default;
    const nodos = (nodo) =>
      !nodo || typeof nodo !== 'object' ? [] : [nodo, ...nodo.children.flatMap(nodos)];
    render = () => {
      indiceEstado = 0;
      indiceRef = 0;
      const arbol = pantalla({
        route: { params: { lectura: { titulo: 'Lectura', texto: 'Texto' } } },
        navigation: { goBack: jest.fn() },
      });
      if (!montado) {
        montado = true;
        efectos.forEach((fn) => fn());
      }
      const lista = nodos(arbol);
      return {
        finalizar: lista.find(
          (n) =>
            n.tipo === 'TouchableOpacity' &&
            n.children.some((h) => h?.children?.includes('Finalizar')),
        ).props.onPress,
        resumen: lista.find((n) => n.tipo === 'Resumen').props,
      };
    };
    tick = (ms) => {
      reloj = ms;
      [...intervalos.values()].forEach((fn) => fn());
    };
  });
  test('se congela al pulsar, incluso mientras guarda y con el resumen abierto', async () => {
    render();
    tick(59000);
    const pantalla = render();
    const guardado = diferido();
    completar.mockReturnValueOnce(guardado.promise);
    reloj = 61200; // El toque ocurre después del último refresco visible.
    const finalizacion = pantalla.finalizar();
    expect(completar.mock.calls[0][1].tiempoSegundos).toBe(61);
    tick(90000);
    expect(render().resumen.tiempoLeido).toBe('01:01');
    guardado.resolve();
    await finalizacion;
    tick(120000);
    expect(render().resumen.visible).toBe(true);
    expect(render().resumen.tiempoLeido).toBe('01:01');
    await render().finalizar();
    expect(completar).toHaveBeenCalledTimes(1);
  });
  test('un reintento conserva la duración y el identificador originales', async () => {
    render();
    tick(12000);
    completar.mockRejectedValueOnce(new Error('fallo de almacenamiento'));
    await render().finalizar();
    tick(35000);
    await render().finalizar();
    expect(alerta).toHaveBeenCalledTimes(1);
    expect(completar.mock.calls[1][1]).toEqual(completar.mock.calls[0][1]);
    expect(render().resumen.tiempoLeido).toBe('00:12');
    expect(render().resumen.visible).toBe(true);
  });
});

// Las constantes se mantienen por entorno para que Expo y Node no dependan del código del otro.
// Esta comprobación evita que el progreso provisional difiera de la recompensa del servidor.
test('frontend y backend usan las mismas reglas de experiencia y nivel', () => {
  const cliente = cargar('servicios/gamificacion.js', {});
  const servidor = require('../src/utilidades/gamificacion');
  expect(cliente.XP_POR_LECTURA).toBe(servidor.XP_POR_LECTURA);
  expect(cliente.XP_POR_NIVEL).toBe(servidor.XP_POR_NIVEL);
  for (const puntos of [0, 20, 99, 100, 101, 200, 999]) {
    expect(cliente.calcularNivel(puntos)).toBe(servidor.calcularNivel(puntos));
  }
});
