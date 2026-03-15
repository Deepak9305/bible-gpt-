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

export const initStats = async () => {
  try {
    const saved = await StorageService.get('user_stats');
    if (saved) {
      cachedStats = { ...INITIAL_STATS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to parse user stats", e);
  }
};

export const getStats = (): UserStats => {
  return cachedStats;
};

export const saveStats = (stats: UserStats) => {
  cachedStats = stats;
  StorageService.set('user_stats', JSON.stringify(stats)).catch(e => console.error(e));
};

export const checkDailyLimit = (): boolean => {
  const stats = getStats();
  if (stats.isPremium) return false;

  // Show premium teaser on specific usage thresholds
  const thresholds = [10, 25, 50, 100];
  return thresholds.includes(stats.dailyUsageCount);
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
  // Paused: Purchases are currently disabled
  return getStats();
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
