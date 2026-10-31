import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { colores } from '../tema/colores';
import { obtenerRanking } from '../servicios/api';
import { calcularNivel } from '../servicios/gamificacion';

const MEDALLAS = ['🥇', '🥈', '🥉'];

export default function PantallaRanking() {
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerRanking();
      setRanking(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={colores.acentoTexto} />
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

  if (!ranking.length) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.textoVacio}>Aún no hay datos de ranking</Text>
        <Text style={estilos.textoVacioSecundario}>Completa lecturas para aparecer aquí</Text>
      </View>
    );
  }

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ padding: 20 }}>
      <Text style={estilos.tituloSeccion}>Ranking</Text>
      <Text style={estilos.subtitulo}>Top lectores activos</Text>

      {ranking.map((item, index) => {
        const esTopTres = index < 3;
        const nivel = item.nivel || calcularNivel(item.puntos || 0);
        return (
          <View
            key={item._id || item.id || index}
            style={[estilos.fila, esTopTres ? estilos.filaTop : estilos.filaNormal]}
          >
            <Text style={estilos.posicion}>{esTopTres ? MEDALLAS[index] : `${index + 1}.`}</Text>
            <View style={estilos.info}>
              <Text style={[estilos.nombre, esTopTres && estilos.nombreTop]}>
                {item.nombre || 'Anónimo'}
              </Text>
              <Text style={estilos.detalle}>Nv {nivel}</Text>
            </View>
            <Text style={[estilos.xp, esTopTres && estilos.xpTop]}>{item.puntos || 0} XP</Text>
          </View>
        );
      })}
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
  tituloSeccion: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colores.textoPrincipal,
    marginTop: 20,
  },
  subtitulo: {
    fontSize: 14,
    color: colores.textoSecundario,
    marginBottom: 20,
    marginTop: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  filaTop: {
    backgroundColor: colores.acentoSuave,
    borderColor: colores.acento,
  },
  filaNormal: {
    backgroundColor: colores.fondoElevado,
    borderColor: colores.borde,
  },
  posicion: {
    fontSize: 18,
    width: 36,
    textAlign: 'center',
    color: colores.textoPrincipal,
  },
  info: { flex: 1, marginLeft: 8 },
  nombre: {
    fontSize: 15,
    fontWeight: '600',
    color: colores.textoPrincipal,
  },
  nombreTop: { color: colores.acentoTexto },
  detalle: {
    fontSize: 12,
    color: colores.textoSecundario,
    marginTop: 2,
  },
  xp: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.textoSecundario,
    fontVariant: ['tabular-nums'],
  },
  xpTop: { color: colores.acentoTexto },
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
});
