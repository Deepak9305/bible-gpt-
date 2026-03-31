import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { initPurchases } from './purchaseService';
import { AppTrackingTransparency } from '@capgo/capacitor-app-tracking-transparency';
import { AdMob } from '@capacitor-community/admob';

export const initializeNativeServices = async () => {
  try {
    // NOTE: initStats() is intentionally NOT called here.
    // AuthContext calls setUserIdForStats(userId) after auth resolves,
    // which internally calls initStats() with the correct scoped user ID.

    // 1.1 Initialize AdMob only on native to avoid web bridge errors
    if (Capacitor.isNativePlatform()) {
      await AdMob.initialize();
      await AdMob.removeBanner().catch(() => { });
    }

    // Initialize in-app purchases AFTER AdMob
    initPurchases();

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
  // Clear existing to avoid duplicates in the 1-7 range
  const idsToCancel = [1, 2, 3, 4, 5, 6, 7];
  await LocalNotifications.cancel({ notifications: idsToCancel.map(id => ({ id })) });

  const weeklyMessages = [
    { id: 1, weekday: 1, title: "Sabbath Reflection", body: "Begin your week with rest and the Word." },
    { id: 2, weekday: 2, title: "Monday Strength", body: "Find divine strength for the week ahead." },
    { id: 3, weekday: 3, title: "Tuesday Trust", body: "Trust in the Lord with all your heart today." },
    { id: 4, weekday: 4, title: "Mid-Week Grace", body: "Refresh your soul with a moment of prayer." },
    { id: 5, weekday: 5, title: "Thursday Thankfulness", body: "Give thanks for the blessings in your life." },
    { id: 6, weekday: 6, title: "Friday Faith", body: "Walk by faith and not by sight today." },
    { id: 7, weekday: 7, title: "Saturday Stillness", body: "Prepare your heart for the Day of the Lord." },
  ];

  await LocalNotifications.schedule({
    notifications: weeklyMessages.map(msg => ({
      id: msg.id,
      title: msg.title,
      body: msg.body,
      schedule: { on: { weekday: msg.weekday, hour: 8, minute: 0 }, repeats: true },
      smallIcon: "ic_launcher_foreground",
    }))
  });
};
