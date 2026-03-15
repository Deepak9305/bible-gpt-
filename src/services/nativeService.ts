import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { initStats } from './statsService';
import { AppTrackingTransparency } from 'capacitor-plugin-app-tracking-transparency';

export const initializeNativeServices = async () => {
  try {
    // 1. Initialize Storage (Stats) - CRITICAL
    await initStats();

    if (Capacitor.isNativePlatform()) {
      // 0. Hide Status Bar (Immersive Mode)
      await StatusBar.hide().catch(e => console.warn("StatusBar hide failed", e));

      // 1.5 Request App Tracking Transparency (iOS)
      if (Capacitor.getPlatform() === 'ios') {
        try {
          const attStatus = await AppTrackingTransparency.getStatus();
          if (attStatus.status === 'notDetermined') {
            await AppTrackingTransparency.requestPermission();
          }
        } catch (e) {
          console.warn("ATT request failed", e);
        }
      }

      // 3. Request Notification Permissions & Schedule
      try {
        const permStatus = await LocalNotifications.requestPermissions();
        if (permStatus.display === 'granted') {
          await scheduleDailyDevotional();
        }
      } catch (e) {
        console.warn("Notifications init failed", e);
      }
    }
  } catch (globalErr) {
    console.error("Critical native service failure:", globalErr);
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
