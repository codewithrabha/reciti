import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createOrUpdateUserDoc } from './db';

// Configure foreground notification behavior for SDK 55
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers the current device for Expo Push Notifications and saves the token to Firestore.
 */
export async function registerForPushNotificationsAsync(uid?: string): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Community Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#059669',
    });
  }

  if (!Device.isDevice && Platform.OS === 'ios') {
    console.log('[Notifications] Must use a physical iOS device for Push Notifications');
    return null;
  }

  const settings = await Notifications.getPermissionsAsync();
  let granted = Boolean((settings as any).granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);

  if (!granted) {
    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    granted = Boolean((request as any).granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);
  }

  if (!granted) {
    console.log('[Notifications] Push notification permission not granted');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    token = tokenData.data;
    console.log('[Notifications] Expo Push Token obtained:', token);

    if (uid && token) {
      await createOrUpdateUserDoc(uid, { pushToken: token });
    }
  } catch (error) {
    console.error('[Notifications] Failed to get Expo Push Token:', error);
  }

  return token;
}

/**
 * Subscribes to notification response events (taps on notifications).
 */
export function setupNotificationListeners(
  onNavigate: (route: string) => void
): () => void {
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    console.log('[Notifications] Notification tapped:', data);

    if (data?.reportId) {
      onNavigate(`/report/${data.reportId}`);
    } else if (data?.listingId) {
      onNavigate(`/directories/${data.listingId}`);
    } else if (data?.eventId) {
      onNavigate(`/events/${data.eventId}`);
    } else {
      onNavigate('/notifications');
    }
  });

  return () => {
    responseSubscription.remove();
  };
}
