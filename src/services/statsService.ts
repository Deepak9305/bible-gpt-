import { StorageService } from './storageService';
import { isSupabaseConfigured, supabase } from './supabaseClient';

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

export const FREE_DAILY_CHAT_LIMIT = 3;

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
let currentCloudUserId: string | null = null;
let remoteStatsSavePromise: Promise<void> = Promise.resolve();

const getStorageKey = () => currentProfileId ? `profile_stats_${currentProfileId}` : 'profile_stats';

const fromRemoteStats = (row: Record<string, unknown>): UserStats => ({
  streak: typeof row.streak === 'number' ? Math.max(0, row.streak) : 0,
  lastVisit: typeof row.last_visit === 'string' ? row.last_visit : '',
  totalVersesRead: typeof row.total_verses_read === 'number' ? Math.max(0, row.total_verses_read) : 0,
  totalPrayers: typeof row.total_prayers === 'number' ? Math.max(0, row.total_prayers) : 0,
  userName: typeof row.user_name === 'string' ? row.user_name : '',
  onboardingCompleted: row.onboarding_completed === true,
  dailyUsageCount: typeof row.daily_usage_count === 'number' ? Math.max(0, row.daily_usage_count) : 0,
  lastUsageDate: typeof row.last_usage_date === 'string' ? row.last_usage_date : '',
});

const hasStats = (stats: UserStats) => (
  stats.streak > 0 ||
  Boolean(stats.lastVisit) ||
  stats.totalVersesRead > 0 ||
  stats.totalPrayers > 0 ||
  Boolean(stats.userName) ||
  stats.onboardingCompleted ||
  stats.dailyUsageCount > 0 ||
  Boolean(stats.lastUsageDate)
);

const mergeStats = (local: UserStats, remote: UserStats): UserStats => {
  const mostRecentVisit = local.lastVisit > remote.lastVisit ? local : remote;
  const mostRecentUsage = local.lastUsageDate > remote.lastUsageDate ? local : remote;

  return {
    streak: mostRecentVisit.streak,
    lastVisit: mostRecentVisit.lastVisit,
    totalVersesRead: Math.max(local.totalVersesRead, remote.totalVersesRead),
    totalPrayers: Math.max(local.totalPrayers, remote.totalPrayers),
    userName: remote.userName || local.userName,
    onboardingCompleted: local.onboardingCompleted || remote.onboardingCompleted,
    dailyUsageCount: mostRecentUsage.dailyUsageCount,
    lastUsageDate: mostRecentUsage.lastUsageDate,
  };
};

const queueRemoteStatsSave = (stats: UserStats) => {
  if (!isSupabaseConfigured || !currentCloudUserId) return;
  const cloudUserId = currentCloudUserId;

  remoteStatsSavePromise = remoteStatsSavePromise
    .catch(() => undefined)
    .then(async () => {
      const { error } = await supabase.from('user_stats').upsert({
        id: cloudUserId,
        streak: stats.streak,
        last_visit: stats.lastVisit,
        total_verses_read: stats.totalVersesRead,
        total_prayers: stats.totalPrayers,
        user_name: stats.userName,
        onboarding_completed: stats.onboardingCompleted,
        daily_usage_count: stats.dailyUsageCount,
        last_usage_date: stats.lastUsageDate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (error) throw error;
    })
    .catch((error) => {
      console.warn('[Cloud data] Could not save user stats remotely.', error.message || error);
    });
};

export const setProfileIdForStats = async (profileId: string | null, cloudUserId: string | null = null) => {
  currentProfileId = profileId;
  currentCloudUserId = cloudUserId;
  await initStats();
};

export const initStats = async () => {
  try {
    const saved = await StorageService.get(getStorageKey());
    const localStats = saved ? { ...INITIAL_STATS, ...JSON.parse(saved) } : { ...INITIAL_STATS };
    cachedStats = localStats;

    if (!isSupabaseConfigured || !currentCloudUserId) return;

    const { data, error } = await supabase
      .from('user_stats')
      .select('streak, last_visit, total_verses_read, total_prayers, user_name, onboarding_completed, daily_usage_count, last_usage_date')
      .eq('id', currentCloudUserId)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const remoteStats = fromRemoteStats(data as Record<string, unknown>);
      cachedStats = hasStats(localStats) ? mergeStats(localStats, remoteStats) : remoteStats;
      await StorageService.set(getStorageKey(), JSON.stringify(cachedStats));
      if (JSON.stringify(cachedStats) !== JSON.stringify(remoteStats)) {
        queueRemoteStatsSave(cachedStats);
      }
    } else if (hasStats(localStats)) {
      // One-time migration for users who already had local stats before cloud
      // persistence was added.
      queueRemoteStatsSave(localStats);
    }
  } catch (error) {
    console.warn('[Cloud data] Could not load user stats; using the local copy.', error);
    if (!cachedStats) cachedStats = { ...INITIAL_STATS };
  }
};

export const getStats = (): UserStats => cachedStats;

export const saveStats = (stats: UserStats) => {
  cachedStats = stats;
  StorageService.set(getStorageKey(), JSON.stringify(stats)).catch(e => console.error(e));
  queueRemoteStatsSave(stats);
};

export const checkDailyLimit = (): boolean => {
  const stats = getStats();
  const today = new Date().toLocaleDateString('en-CA');

  if (stats.lastUsageDate !== today) return false;

  return stats.dailyUsageCount >= FREE_DAILY_CHAT_LIMIT;
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
