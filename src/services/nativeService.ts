import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { initPurchases } from './IAPService';
import { AppTrackingTransparency } from '@capgo/capacitor-app-tracking-transparency';
import { AdMob } from '@capacitor-community/admob';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export const initializeNativeServices = async () => {
  try {
    // NOTE: initStats() is intentionally NOT called here.
    // AuthContext calls setUserIdForStats(userId) after auth resolves,
    // which internally calls initStats() with the correct scoped user ID.

    // 1.1 Initialize AdMob and Google Auth only on native to avoid web bridge errors
    if (Capacitor.isNativePlatform()) {
      await AdMob.initialize({ initializeForTesting: false });
      await AdMob.removeBanner().catch(() => { });

      await GoogleAuth.initialize({
        clientId: '1083543499729-3rrelit5mm4jno7jfogpnaceh9inlgu4.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      }).catch(() => { });
    }

    // Mark deviceready as fired so late callers of initPurchases run synchronously.
    // initPurchases() internally waits for this event itself, but setting the flag
    // here ensures the fallback path in purchaseService works correctly.
    if (Capacitor.isNativePlatform()) {
      // Bug fix: the old if/else had the condition inverted — it called markReady()
      // only when __cordovaReady was already true (a no-op). Always register the
      // listener; { once: true } makes it safe to re-register.
      document.addEventListener('deviceready', () => {
        (document as any).__cordovaReady = true;
      }, { once: true });
    }

    // Initialize in-app purchases AFTER AdMob.
    // On native, this internally waits for the 'deviceready' event before
    // accessing window.CdvPurchase (Cordova bridge guarantee).
    initPurchases();

    if (Capacitor.isNativePlatform()) {
      // 0. Hide Status Bar (Immersive Mode)
      await StatusBar.hide().catch(() => { });

      // 1.5 Request App Tracking Transparency (iOS)
      if (Capacitor.getPlatform() === 'ios') {
        try {
          const attStatus = await AppTrackingTransparency.getStatus();
          if (attStatus.status === 'notDetermined') {
            await AppTrackingTransparency.requestPermission();
          }
        } catch (e) {
          // Ignore
        }
      }

      // 3. Request Notification Permissions & Schedule
      try {
        const permStatus = await LocalNotifications.requestPermissions();
        if (permStatus.display === 'granted') {
          await scheduleDailyDevotional();
        }
      } catch (e) {
        // Ignore
      }
    }
  } catch (globalErr) {
    // Ignore
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
