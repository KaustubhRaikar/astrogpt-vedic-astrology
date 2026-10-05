import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_NOTIFICATIONS = '@astro_festival_notifications_v1';
const KEY_WEEKLY_FORECAST_ENABLED = '@astro_weekly_forecast_enabled';
const KEY_WEEKLY_FORECAST_ID = '@astro_weekly_forecast_id';
const KEY_MONTHLY_FORECAST_ENABLED = '@astro_monthly_forecast_enabled';
const KEY_MONTHLY_FORECAST_ID = '@astro_monthly_forecast_id';

// Configure notification handling behavior when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
} catch (e) {
  console.warn('Expo Notifications configuration notice:', e);
}

export interface ScheduledFestivalNotification {
  date: string; // YYYY-MM-DD
  notificationId: string;
  festivalName: string;
  muhurtaHint?: string;
  scheduledTimeIso: string;
}

export const notificationService = {
  /**
   * Request user permission for local notifications
   */
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true; // Web notification simulated
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('Error requesting notification permissions:', err);
      return false;
    }
  },

  /**
   * Get all scheduled festival notifications saved in local storage
   */
  getScheduledMap: async (): Promise<Record<string, ScheduledFestivalNotification>> => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      return json ? JSON.parse(json) : {};
    } catch (e) {
      console.error('Failed to read scheduled notifications from storage', e);
      return {};
    }
  },

  /**
   * Check if a notification is scheduled for a given date (YYYY-MM-DD)
   */
  isScheduled: async (dateStr: string): Promise<boolean> => {
    const map = await notificationService.getScheduledMap();
    return !!map[dateStr];
  },

  /**
   * Toggle local notification for a festival/date (Schedule if off, Cancel if on)
   * Returns true if newly scheduled, false if cancelled.
   */
  toggleNotification: async (
    dateStr: string,
    festivalName: string,
    muhurtaHint?: string
  ): Promise<boolean> => {
    const map = await notificationService.getScheduledMap();
    const existing = map[dateStr];

    if (existing) {
      // Cancel scheduled notification
      try {
        if (Platform.OS !== 'web' && existing.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
        }
      } catch (err) {
        console.warn('Error cancelling notification id:', existing.notificationId, err);
      }
      delete map[dateStr];
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(map));
      return false; // Now toggled off
    } else {
      // Schedule new local notification
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permission not granted');
      }

      // Calculate 7:00 AM local time on dateStr
      const targetDate = new Date(`${dateStr}T07:00:00`);
      const now = new Date();

      // If target time is in the past, schedule for 10 seconds from now for testing/demo
      let triggerDate = targetDate;
      if (targetDate.getTime() <= now.getTime()) {
        triggerDate = new Date(now.getTime() + 10 * 1000);
      }

      let notificationId = `local_notif_${dateStr}_${Date.now()}`;
      try {
        if (Platform.OS !== 'web') {
          notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${festivalName} Today 🪔`,
              body: muhurtaHint
                ? `${festivalName} auspicious timing: ${muhurtaHint}. Click to open full Panchang.`
                : `Today is ${festivalName}. Tap to check today's auspicious Panchang & Muhurta timings.`,
              data: { date: dateStr, festivalName },
            },
            trigger: triggerDate as any,
          });
        }
      } catch (e) {
        console.warn('Fallback local notification schedule error:', e);
      }

      map[dateStr] = {
        date: dateStr,
        notificationId,
        festivalName,
        muhurtaHint,
        scheduledTimeIso: triggerDate.toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(map));
      return true; // Now toggled on
    }
  },

  /**
   * Get settings status for Weekly & Monthly forecast notifications
   */
  getForecastNotificationSettings: async (): Promise<{ weeklyEnabled: boolean; monthlyEnabled: boolean }> => {
    try {
      const weeklyVal = await AsyncStorage.getItem(KEY_WEEKLY_FORECAST_ENABLED);
      const monthlyVal = await AsyncStorage.getItem(KEY_MONTHLY_FORECAST_ENABLED);
      return {
        weeklyEnabled: weeklyVal === 'true',
        monthlyEnabled: monthlyVal === 'true',
      };
    } catch (e) {
      console.error('Error fetching forecast notification settings', e);
      return { weeklyEnabled: false, monthlyEnabled: false };
    }
  },

  /**
   * Enable/Disable recurring Weekly Forecast notification (Sunday 6:00 PM)
   */
  setWeeklyForecastNotification: async (enabled: boolean): Promise<boolean> => {
    try {
      const existingId = await AsyncStorage.getItem(KEY_WEEKLY_FORECAST_ID);
      if (existingId && Platform.OS !== 'web') {
        try {
          await Notifications.cancelScheduledNotificationAsync(existingId);
        } catch (err) {
          console.warn('Error cancelling weekly forecast notification:', err);
        }
        await AsyncStorage.removeItem(KEY_WEEKLY_FORECAST_ID);
      }

      if (enabled) {
        const hasPermission = await notificationService.requestPermissions();
        if (!hasPermission) {
          console.warn('Notification permission denied');
        }

        let newId = `weekly_forecast_${Date.now()}`;
        if (Platform.OS !== 'web') {
          newId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Your Weekly Cosmic Forecast is Ready 🌟',
              body: 'Tap to view your fresh planetary transit outlook and dasha influences for the week ahead.',
              data: { type: 'forecast', period: 'week' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: 1, // Sunday = 1 in Expo Notifications
              hour: 18,
              minute: 0,
            } as any,
          });
        }
        await AsyncStorage.setItem(KEY_WEEKLY_FORECAST_ENABLED, 'true');
        await AsyncStorage.setItem(KEY_WEEKLY_FORECAST_ID, newId);
        return true;
      } else {
        await AsyncStorage.setItem(KEY_WEEKLY_FORECAST_ENABLED, 'false');
        return false;
      }
    } catch (e) {
      console.error('Error toggling weekly forecast notification', e);
      return false;
    }
  },

  /**
   * Enable/Disable recurring Monthly Forecast notification (1st of month at 8:00 AM)
   */
  setMonthlyForecastNotification: async (enabled: boolean): Promise<boolean> => {
    try {
      const existingId = await AsyncStorage.getItem(KEY_MONTHLY_FORECAST_ID);
      if (existingId && Platform.OS !== 'web') {
        try {
          await Notifications.cancelScheduledNotificationAsync(existingId);
        } catch (err) {
          console.warn('Error cancelling monthly forecast notification:', err);
        }
        await AsyncStorage.removeItem(KEY_MONTHLY_FORECAST_ID);
      }

      if (enabled) {
        const hasPermission = await notificationService.requestPermissions();
        if (!hasPermission) {
          console.warn('Notification permission denied');
        }

        let newId = `monthly_forecast_${Date.now()}`;
        if (Platform.OS !== 'web') {
          newId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Your Monthly Cosmic Forecast is Ready 🪐',
              body: 'Tap to view your fresh transit movements and astrological guidance for the month.',
              data: { type: 'forecast', period: 'month' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
              day: 1,
              hour: 8,
              minute: 0,
            } as any,
          });
        }
        await AsyncStorage.setItem(KEY_MONTHLY_FORECAST_ENABLED, 'true');
        await AsyncStorage.setItem(KEY_MONTHLY_FORECAST_ID, newId);
        return true;
      } else {
        await AsyncStorage.setItem(KEY_MONTHLY_FORECAST_ENABLED, 'false');
        return false;
      }
    } catch (e) {
      console.error('Error toggling monthly forecast notification', e);
      return false;
    }
  },
};
