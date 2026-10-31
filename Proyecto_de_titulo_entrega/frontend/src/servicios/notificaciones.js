import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Suprimir la presentación en primer plano conserva todos los recordatorios y
// sus calendarios. Cancelarlos y recrearlos podía perderlos o mover sus fechas.
export const iniciarEnfoqueNotificaciones = () => {
  if (Platform.OS === 'web') return () => {};
  let enEnfoque = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: !enEnfoque,
      shouldSetBadge: !enEnfoque,
      shouldShowBanner: !enEnfoque,
      shouldShowList: !enEnfoque,
    }),
  });
  return () => {
    enEnfoque = false;
  };
};
