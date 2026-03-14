import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { initStats } from './statsService';
import { AppTrackingTransparency } from 'capacitor-plugin-app-tracking-transparency';

export const initializeNativeServices = async () => {
  // 1. Initialize Storage (Stats)
  await initStats();

  if (Capacitor.isNativePlatform()) {
    try {
      // 1.5 Request App Tracking Transparency (iOS)
      if (Capacitor.getPlatform() === 'ios') {
        const attStatus = await AppTrackingTransparency.getStatus();
        if (attStatus.status === 'notDetermined') {
          await AppTrackingTransparency.requestPermission();
        }
      }

      // 3. Request Notification Permissions & Schedule
      const permStatus = await LocalNotifications.requestPermissions();
      if (permStatus.display === 'granted') {
        await scheduleDailyDevotional();
      }
    } catch (e) {
      console.error("Failed to initialize some native services", e);
    }
  }
};

const scheduleDailyDevotional = async () => {
  // Clear existing to avoid duplicates
  await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

  await LocalNotifications.schedule({
    notifications: [
      {
        title: "Daily Devotional",
        body: "Take a moment for your daily verse and prayer.",
        id: 1,
        schedule: { on: { hour: 8, minute: 0 }, repeats: true },
        smallIcon: "ic_stat_icon_config_sample", // Ensure you have an icon or omit
      }
    ]
  });
};
