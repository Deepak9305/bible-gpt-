import { StorageService } from './storageService';

export interface UserStats {
  streak: number;
  lastVisit: string;
  totalVersesRead: number;
  totalPrayers: number;
  userName: string;
  onboardingCompleted: boolean;
  dailyUsageCount: number;
  lastUsageDate: string;
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
};

let cachedStats: UserStats = { ...INITIAL_STATS };
let currentProfileId: string | null = null;

const getStorageKey = () => currentProfileId ? `profile_stats_${currentProfileId}` : 'profile_stats';

export const setProfileIdForStats = async (profileId: string | null) => {
  currentProfileId = profileId;
  await initStats();
};

export const initStats = async () => {
  try {
    const saved = await StorageService.get(getStorageKey());
    cachedStats = saved ? { ...INITIAL_STATS, ...JSON.parse(saved) } : { ...INITIAL_STATS };
  } catch (e) {
    console.error('Failed to parse user stats', e);
    cachedStats = { ...INITIAL_STATS };
  }
};

export const getStats = (): UserStats => cachedStats;

export const saveStats = (stats: UserStats) => {
  cachedStats = stats;
  StorageService.set(getStorageKey(), JSON.stringify(stats)).catch(e => console.error(e));
};

export const checkDailyLimit = (): boolean => {
  const stats = getStats();
  const today = new Date().toLocaleDateString('en-CA');

  if (stats.lastUsageDate !== today) return false;

  return stats.dailyUsageCount >= 5;
};

export const incrementDailyUsage = () => {
  const stats = getStats();
  const today = new Date().toLocaleDateString('en-CA');
  const dailyUsageCount = stats.lastUsageDate === today ? stats.dailyUsageCount + 1 : 1;
  const updated = { ...stats, dailyUsageCount, lastUsageDate: today };

  saveStats(updated);
  return updated;
};

export const updateStreak = () => {
  const stats = getStats();
  const today = new Date().toLocaleDateString('en-CA');

  if (stats.lastVisit === today) return stats;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  const streak = stats.lastVisit === yesterdayStr ? stats.streak + 1 : 1;
  const updated = { ...stats, streak, lastVisit: today };

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
