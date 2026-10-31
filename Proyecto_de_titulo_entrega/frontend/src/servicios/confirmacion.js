// ─── Diálogos de confirmación y avisos ───
// Unifica cómo mostramos alertas en web y móvil:
// la web tiene window.confirm/window.alert y React Native usa Alert,

import { Alert } from 'react-native';

// Pregunta al usuario con botones "Cancelar"/"Aceptar".
// Devuelve una promesa: true si confirmó, false si canceló.
export const confirmar = (titulo, mensaje) => {
  return new Promise((resolve) => {
    // En web usamos el diálogo nativo del navegador
    if (typeof window !== 'undefined' && window.confirm) {
      resolve(window.confirm(mensaje));
      return;
    }

    // En celular usamos Alert, que responde por los botones
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Aceptar', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
};

// Muestra un aviso informativo simple (sin opción de cancelar).
export const mostrarAlerta = (titulo, mensaje) => {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(mensaje);
    return;
  }

  Alert.alert(titulo, mensaje);
};
