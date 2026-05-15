import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { AppTrackingTransparency } from '@capgo/capacitor-app-tracking-transparency';
import { adService } from './adService';

export const initializeNativeServices = async () => {
  if (!Capacitor.isNativePlatform()) return;

  await StatusBar.hide().catch(() => { });

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

  await adService.initialize().catch((error) => {
    console.error('AdMob setup failed:', error);
  });

  try {
    const permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display === 'granted') {
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'devotional_channel',
          name: 'Daily Devotionals',
          description: 'Reminders for daily devotionals',
          importance: 4,
          visibility: 1
        });
      }
      await scheduleDailyDevotional();
    }
  } catch (e) {
    console.error('Notification setup failed:', e);
  }
};


const scheduleDailyDevotional = async () => {
  const idsToCancel = [1, 2, 3, 4, 5, 6, 7];
  await LocalNotifications.cancel({ notifications: idsToCancel.map(id => ({ id })) });

  // Capacitor LocalNotifications weekday convention: 1=Sunday, 2=Monday, ..., 7=Saturday
  const weeklyMessages = [
    { id: 1, weekday: 1, title: "Sunday Reflection", body: "Begin your week with rest and the Word." },
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
      smallIcon: 'ic_stat_notify',
      channelId: 'devotional_channel',
    }))
  });
};
