import { StorageService } from './storageService';
import { Capacitor } from '@capacitor/core';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface UserStats {
  streak: number;
  lastVisit: string;
  totalVersesRead: number;
  totalPrayers: number;
  userName: string;
  onboardingCompleted: boolean;
  dailyUsageCount: number;
  lastUsageDate: string;
  isPremium: boolean;
}

const INITIAL_STATS: UserStats = {
  streak: 0,
  lastVisit: '',
  totalVersesRead: 0,
  totalPrayers: 0,
  userName: '',
  onboardingCompleted: false,
  dailyUsageCount: 0,
  lastUsageDate: '',
  isPremium: false,
};

let cachedStats: UserStats = { ...INITIAL_STATS };
let currentUserId: string | null = null;

export const setUserIdForStats = async (userId: string | null) => {
  currentUserId = userId;
  await initStats();
};

export const initStats = async () => {
  try {
    if (isSupabaseConfigured && currentUserId && !currentUserId.startsWith('guest-')) {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (data) {
        cachedStats = {
          ...INITIAL_STATS,
          streak: data.streak || 0,
          lastVisit: data.last_visit || '',
          totalVersesRead: data.total_verses_read || 0,
          totalPrayers: data.total_prayers || 0,
          userName: data.user_name || '',
          onboardingCompleted: data.onboarding_completed || false,
          dailyUsageCount: data.daily_usage_count || 0,
          lastUsageDate: data.last_usage_date || '',
          isPremium: data.is_premium || false
        };
        await StorageService.set(`user_stats_${currentUserId}`, JSON.stringify(cachedStats));
        return;
      }
    }

    // Fallback to local storage map
    const key = currentUserId ? `user_stats_${currentUserId}` : 'user_stats';
    const saved = await StorageService.get(key);
    if (saved) {
      cachedStats = { ...INITIAL_STATS, ...JSON.parse(saved) };
    } else {
      cachedStats = { ...INITIAL_STATS };
    }
  } catch (e) {
    console.error("Failed to parse user stats", e);
    cachedStats = { ...INITIAL_STATS };
  }
};

export const getStats = (): UserStats => {
  return cachedStats;
};

export const saveStats = (stats: UserStats) => {
  cachedStats = stats;
  const key = currentUserId ? `user_stats_${currentUserId}` : 'user_stats';
  StorageService.set(key, JSON.stringify(stats)).catch(e => console.error(e));

  if (isSupabaseConfigured && currentUserId && !currentUserId.startsWith('guest-')) {
    const payload = {
      id: currentUserId,
      streak: stats.streak,
      last_visit: stats.lastVisit,
      total_verses_read: stats.totalVersesRead,
      total_prayers: stats.totalPrayers,
      user_name: stats.userName,
      onboarding_completed: stats.onboardingCompleted,
      daily_usage_count: stats.dailyUsageCount,
      last_usage_date: stats.lastUsageDate,
      is_premium: stats.isPremium,
      updated_at: new Date().toISOString()
    };
    supabase.from('user_stats').upsert(payload).then(res => {
      if (res.error) console.error("Failed to sync stats to Supabase:", res.error);
    });
  }
};

export const checkDailyLimit = (): boolean => {
  // Bypass premium limits completely on Web
  if (!Capacitor.isNativePlatform()) return false;

  const stats = getStats();
  const today = new Date().toLocaleDateString('en-CA');

  // If user is premium, no limit
  if (stats.isPremium) return false;

  // If it's a new day, limit is not reached
  if (stats.lastUsageDate !== today) return false;

  // Return true if usage count is 1 or more (meaning 2nd message is blocked)
  return stats.dailyUsageCount >= 1;
};

export const incrementDailyUsage = () => {
  const stats = getStats();
  const today = new Date().toLocaleDateString('en-CA');

  let newCount = stats.dailyUsageCount;

  if (stats.lastUsageDate !== today) {
    newCount = 1;
  } else {
    newCount += 1;
  }

  const updated = { ...stats, dailyUsageCount: newCount, lastUsageDate: today };
  saveStats(updated);
  return updated;
};

export const upgradeToPremium = () => {
  const stats = getStats();
  const updated = { ...stats, isPremium: true };
  saveStats(updated);
  return updated;
};

export const updateStreak = () => {
  const stats = getStats();
  const now = new Date();
  const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

  if (stats.lastVisit === today) return stats;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  let newStreak = stats.streak;
  if (stats.lastVisit === yesterdayStr) {
    newStreak += 1;
  } else if (stats.lastVisit === '') {
    newStreak = 1;
  } else {
    newStreak = 1; // Reset if missed a day
  }

  const updated = { ...stats, streak: newStreak, lastVisit: today };
  saveStats(updated);
  return updated;
};

export const incrementVersesRead = () => {
  const stats = getStats();
  const updated = { ...stats, totalVersesRead: stats.totalVersesRead + 1 };
  saveStats(updated);
  return updated;
};

export const incrementPrayers = () => {
  const stats = getStats();
  const updated = { ...stats, totalPrayers: stats.totalPrayers + 1 };
  saveStats(updated);
  return updated;
};

export const completeOnboarding = (name: string) => {
  const stats = getStats();
  const updated = { ...stats, userName: name, onboardingCompleted: true };
  saveStats(updated);
  return updated;
};
