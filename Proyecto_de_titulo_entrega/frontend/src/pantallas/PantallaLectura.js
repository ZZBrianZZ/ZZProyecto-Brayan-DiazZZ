import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { iniciarEnfoqueNotificaciones } from '../servicios/notificaciones';
import { mostrarAlerta } from '../servicios/confirmacion';
import { colores } from '../tema/colores';
import { ContextoUsuario } from '../contexto/ContextoUsuario';
import { XP_POR_LECTURA } from '../servicios/gamificacion';
import ModalFelicitacion from '../componentes/ModalFelicitacion';
import ImagenLectura from '../componentes/ImagenLectura';

const { height } = Dimensions.get('window');

export default function PantallaLectura({ route, navigation }) {
  const { lectura } = route.params;
  const imagenes = lectura.imagenes || [];
  const separadores = [...lectura.texto.matchAll(/\r?\n+/g)];
  // Cortar entre párrafos, conservando todos los caracteres del texto original.
  const corte = separadores.length
    ? separadores[Math.floor(separadores.length / 2)].index
    : lectura.texto.length;
  const { usuario, completarLectura } = useContext(ContextoUsuario);
  const fechaInicioRef = useRef(Date.now());
  const temporizadorRef = useRef(null);
  const segundosFinalesRef = useRef(null);
  const [segundos, setSegundos] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);
  const [ultimoToque, setUltimoToque] = useState(Date.now());
  const [modalVisible, setModalVisible] = useState(false);
  const finalizandoRef = useRef(false);
  const sesionLecturaRef = useRef(null);

  // Usa tiempo transcurrido real para que los retrasos del intervalo no alteren la duración.
  useEffect(() => {
    temporizadorRef.current = setInterval(() => {
      if (segundosFinalesRef.current === null) {
        setSegundos(Math.floor((Date.now() - fechaInicioRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(temporizadorRef.current);
  }, []);

  useEffect(() => iniciarEnfoqueNotificaciones(), []);

  // Auto-ocultar UI después de 4 segundos sin interacción para no distraer la lectura
  useEffect(() => {
    const check = setInterval(() => {
      if (Date.now() - ultimoToque > 4000 && uiVisible) {
        setUiVisible(false);
      }
    }, 1000);
    return () => clearInterval(check);
  }, [ultimoToque, uiVisible]);

  // Distingue un toque breve (alternar controles) de un arrastre (scroll del texto).
  // El envoltorio táctil anterior capturaba los gestos y bloqueaba el desplazamiento en Android.
  const toqueInicioRef = useRef(null);
  const seMovioRef = useRef(false);

  const alTocarInicio = useCallback((e) => {
    const t = e.nativeEvent;
    toqueInicioRef.current = { tiempo: Date.now(), x: t.pageX, y: t.pageY };
    seMovioRef.current = false;
  }, []);

  const alTocarMover = useCallback((e) => {
    if (!toqueInicioRef.current) return;
    const t = e.nativeEvent;
    const dx = t.pageX - toqueInicioRef.current.x;
    const dy = t.pageY - toqueInicioRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      seMovioRef.current = true;
    }
  }, []);

  const alTocarFin = useCallback(() => {
    setUltimoToque(Date.now());
    const inicio = toqueInicioRef.current;
    toqueInicioRef.current = null;
    if (!inicio) return;
    const duracion = Date.now() - inicio.tiempo;
    // Solo un toque breve sin desplazamiento alterna la visibilidad de los controles.
    if (!seMovioRef.current && duracion < 400) {
      setUiVisible((prev) => !prev);
    }
    seMovioRef.current = false;
  }, []);

  // Convierte segundos a formato mm:ss
  const formatearTiempo = (totalSegundos) => {
    const mins = Math.floor(totalSegundos / 60);
    const segs = totalSegundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Registra la sesión en el contexto (XP, racha, historial) y muestra el modal de felicitación
  const finalizarLectura = async () => {
    if (finalizandoRef.current) return;
    finalizandoRef.current = true;
    // Fijar la duración al pulsar, antes del guardado y de mostrar el resumen.
    // Un reintento de guardado conserva la misma duración e identificador.
    if (segundosFinalesRef.current === null) {
      segundosFinalesRef.current = Math.floor((Date.now() - fechaInicioRef.current) / 1000);
    }
    clearInterval(temporizadorRef.current);
    setSegundos(segundosFinalesRef.current);
    try {
      if (!sesionLecturaRef.current) {
        sesionLecturaRef.current = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
      }
      await completarLectura(XP_POR_LECTURA, {
        sesionId: sesionLecturaRef.current,
        titulo: lectura.titulo,
        tiempoSegundos: segundosFinalesRef.current,
      });
      setModalVisible(true);
    } catch (error) {
      finalizandoRef.current = false;
      mostrarAlerta('No se pudo guardar la lectura', error.message);
    }
  };

  // Cierra el modal y vuelve a la pantalla anterior
  const cerrarModal = () => {
    setModalVisible(false);
    navigation.goBack();
  };

  return (
    <View style={estilos.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoEnfoque} />

      <ScrollView
        style={estilos.zonaTactil}
        contentContainerStyle={[estilos.scroll, { filter: 'grayscale(100%)' }]}
        showsVerticalScrollIndicator={false}
        onTouchStart={alTocarInicio}
        onTouchMove={alTocarMover}
        onTouchEnd={alTocarFin}
        onTouchCancel={alTocarFin}
        onScrollBeginDrag={() => {
          seMovioRef.current = true;
        }}
      >
        <Text style={estilos.titulo}>{lectura.titulo}</Text>
        {imagenes[0] && <ImagenLectura key={imagenes[0].id} imagen={imagenes[0]} />}
        {imagenes.length > 1 ? (
          <>
            <Text style={estilos.cuerpoTexto}>{lectura.texto.slice(0, corte)}</Text>
            <ImagenLectura key={imagenes[1].id} imagen={imagenes[1]} />
            <Text style={estilos.cuerpoTexto}>{lectura.texto.slice(corte)}</Text>
          </>
        ) : (
          <Text style={estilos.cuerpoTexto}>{lectura.texto}</Text>
        )}
        {lectura.autor && (
          <Text style={[estilos.cuerpoTexto, { fontSize: 14, lineHeight: 22, marginTop: 28 }]}>
            {lectura.autor}
            {'\n'}
            {lectura.obraOriginal}
            {lectura.esFragmento ? ' · Fragmento' : ''}
            {'\n'}
            Fuente: {lectura.fuenteUrl}
          </Text>
        )}

        {/* Espacio al final para que el texto no quede pegado abajo */}
        <View style={{ height: height * 0.3 }} />
      </ScrollView>

      {/* Controles visibles según la interacción del usuario */}
      <View
        style={[estilos.uiSuperpuesta, { opacity: uiVisible ? 1 : 0 }]}
        pointerEvents={uiVisible ? 'box-none' : 'none'}
      >
        {/* Barra superior minimalista */}
        <View style={estilos.barraSuperior}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={estilos.botonVolver}
            activeOpacity={0.6}
          >
            <Text style={estilos.iconoVolver}>‹</Text>
          </TouchableOpacity>

          <Text style={estilos.cronometro}>{formatearTiempo(segundos)}</Text>

          <View style={estilos.indicadorEnfoque}>
            <View style={estilos.puntoEnfoque} />
          </View>
        </View>

        {/* Finalización y guardado de la sesión */}
        <View style={estilos.areaBoton}>
          <TouchableOpacity
            style={estilos.botonFinalizar}
            onPress={finalizarLectura}
            activeOpacity={0.7}
          >
            <Text style={estilos.textoBoton}>Finalizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ModalFelicitacion
        visible={modalVisible}
        xp={XP_POR_LECTURA}
        racha={usuario.rachaDias}
        nivel={usuario.nivel}
        tiempoLeido={formatearTiempo(segundos)}
        onContinuar={cerrarModal}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondoEnfoque,
  },

  zonaTactil: {
    flex: 1,
  },

  scroll: {
    paddingHorizontal: 28,
    paddingTop: 70, // Espacio para la barra superior
    paddingBottom: 40,
  },

  // ─── Tipografía de lectura prolongada ───
  titulo: {
    fontSize: 20,
    fontWeight: '400', // No negrita, elegante
    color: colores.textoEnfoque,
    marginBottom: 32,
    letterSpacing: 0.3,
    lineHeight: 26,
    opacity: 0.9,
  },

  cuerpoTexto: {
    fontSize: 19, // Tamaño cómodo para lectura
    lineHeight: 32, // Aire entre líneas (proporción 1.68)
    color: colores.textoEnfoque,
    letterSpacing: 0.2,
    fontWeight: '300', // Delgado, no agresivo
    textAlign: 'left',
  },

  // ─── UI que se desvanece ───
  uiSuperpuesta: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },

  barraSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  botonVolver: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colores.fondoElevado,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.bordeSutil,
  },

  iconoVolver: {
    color: colores.textoSecundario,
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
    marginLeft: -2,
  },

  cronometro: {
    fontSize: 13,
    fontWeight: '400',
    color: colores.textoDesactivado,
    fontVariant: ['tabular-nums'], // Números monoespaciados, no saltan
    letterSpacing: 1,
  },

  indicadorEnfoque: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  puntoEnfoque: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colores.acento,
    opacity: 0.4, // Indicador tenue del modo enfoque
  },

  // ─── Botón de finalización ───
  areaBoton: {
    alignItems: 'center',
  },

  botonFinalizar: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: 'transparent', // Sin fondo sólido
  },

  textoBoton: {
    color: colores.textoSecundario,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
