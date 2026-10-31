import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colores } from '../tema/colores';
import { ContextoUsuario } from '../contexto/ContextoUsuario';

// Catálogo de logros disponibles.
// Cada uno indica qué métrica usa (tipo) y cuánto se necesita (requisito),
// así el desbloqueo se calcula de una sola manera y no por "id".
const logros = [
  {
    id: '1',
    nombre: 'Primera Lectura',
    descripcion: 'Completa tu primera lectura',
    tipo: 'lecturas',
    requisito: 1,
    icono: '📖',
  },
  {
    id: '2',
    nombre: 'Racha de 7 días',
    descripcion: 'Lee 7 días seguidos',
    tipo: 'racha',
    requisito: 7,
    icono: '🔥',
  },
  {
    id: '3',
    nombre: '30 minutos',
    descripcion: 'Acumula 30 minutos de lectura',
    tipo: 'minutos',
    requisito: 30,
    icono: '⏱️',
  },
  {
    id: '4',
    nombre: 'Nivel 3',
    descripcion: 'Alcanza el nivel 3',
    tipo: 'nivel',
    requisito: 3,
    icono: '⭐',
  },
  {
    id: '5',
    nombre: 'Explorador',
    descripcion: 'Completa 5 lecturas',
    tipo: 'lecturas',
    requisito: 5,
    icono: '🌿',
  },
  {
    id: '6',
    nombre: 'Dedicación',
    descripcion: 'Racha de 30 días',
    tipo: 'racha',
    requisito: 30,
    icono: '💪',
  },
];

export default function PantallaLogros() {
  // Lee las estadísticas globales del usuario para evaluar los logros
  const { usuario } = useContext(ContextoUsuario);

  // Total de segundos leídos acumulados en el historial (para el logro de minutos)
  const totalSegundosLeidos = (usuario.historial || []).reduce(
    (total, lectura) => total + (lectura.segundos || 0),
    0,
  );

  // Determina si un logro está completado según su tipo y requisito
  const logroCompletado = (logro) => {
    switch (logro.tipo) {
      case 'nivel':
        return usuario.nivel >= logro.requisito;
      case 'racha':
        return usuario.rachaDias >= logro.requisito;
      case 'lecturas':
        return (usuario.historial || []).length >= logro.requisito;
      case 'minutos':
        return totalSegundosLeidos >= logro.requisito * 60;
      default:
        return false;
    }
  };

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ padding: 20 }}>
      <Text style={estilos.tituloSeccion}>Logros</Text>
      <Text style={estilos.subtitulo}>Desbloquea logros a medida que avanzas</Text>

      {/* Renderiza cada logro, cambiando su estilo e icono si ya fue completado */}
      {logros.map((logro) => {
        const completado = logroCompletado(logro);
        return (
          <View
            key={logro.id}
            style={[
              estilos.tarjeta,
              completado ? estilos.tarjetaCompletada : estilos.tarjetaBloqueada,
            ]}
          >
            <Text style={estilos.icono}>{completado ? logro.icono : '🔒'}</Text>
            <View style={estilos.contenido}>
              <Text style={[estilos.nombre, completado && estilos.nombreCompletado]}>
                {logro.nombre}
              </Text>
              <Text style={estilos.descripcion}>{logro.descripcion}</Text>
            </View>
            {completado && <Text style={estilos.check}>✅</Text>}
          </View>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  tituloSeccion: { fontSize: 22, fontWeight: 'bold', color: colores.textoPrincipal, marginTop: 20 },
  subtitulo: { fontSize: 14, color: colores.textoSecundario, marginBottom: 20, marginTop: 4 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  tarjetaCompletada: { backgroundColor: colores.acentoSuave, borderColor: colores.acento },
  tarjetaBloqueada: {
    backgroundColor: colores.fondoElevado,
    borderColor: colores.borde,
    opacity: 0.6,
  },
  icono: { fontSize: 28, marginRight: 14 },
  contenido: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '600', color: colores.textoPrincipal },
  nombreCompletado: { color: colores.acentoTexto },
  descripcion: { fontSize: 12, color: colores.textoSecundario, marginTop: 2 },
  check: { fontSize: 18, marginLeft: 8 },
});
