import { StorageService } from './storageService';

export type InsightPage = 'home' | 'chat' | 'library' | 'bookmarks' | 'journal' | 'settings' | 'insights';

export const INSIGHT_PAGE_ORDER: InsightPage[] = [
  'home',
  'chat',
  'library',
  'bookmarks',
  'journal',
  'settings',
  'insights',
];

export interface InsightDay {
  totalSeconds: number;
  pages: Record<InsightPage, number>;
}

export interface InsightsData {
  version: 1;
  totalSeconds: number;
  sessions: number;
  pages: Record<InsightPage, number>;
  daily: Record<string, InsightDay>;
  firstTrackedAt: string | null;
  lastUpdatedAt: string | null;
}

export interface RecentInsightDay extends InsightDay {
  key: string;
  label: string;
}

const STORAGE_PREFIX = 'bible_nova_insights_';
const MAX_DAILY_HISTORY = 35;
const MAX_RECORDED_INTERVAL_SECONDS = 300;
const appSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const countedSessions = new Set<string>();

type CacheEntry = {
  data: InsightsData;
  loadPromise: Promise<void> | null;
  savePromise: Promise<void>;
};

const cache = new Map<string, CacheEntry>();

const createEmptyPages = (): Record<InsightPage, number> => ({
  home: 0,
  chat: 0,
  library: 0,
  bookmarks: 0,
  journal: 0,
  settings: 0,
  insights: 0,
});

const createEmptyDay = (): InsightDay => ({
  totalSeconds: 0,
  pages: createEmptyPages(),
});

const createEmptyData = (): InsightsData => ({
  version: 1,
  totalSeconds: 0,
  sessions: 0,
  pages: createEmptyPages(),
  daily: {},
  firstTrackedAt: null,
  lastUpdatedAt: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const safeNumber = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
);

const normalizePages = (value: unknown): Record<InsightPage, number> => {
  const source = isRecord(value) ? value : {};
  return INSIGHT_PAGE_ORDER.reduce((pages, page) => {
    pages[page] = safeNumber(source[page]);
    return pages;
  }, createEmptyPages());
};

const normalizeDay = (value: unknown): InsightDay => {
  const source = isRecord(value) ? value : {};
  return {
    totalSeconds: safeNumber(source.totalSeconds),
    pages: normalizePages(source.pages),
  };
};

const normalizeData = (value: unknown): InsightsData => {
  const source = isRecord(value) ? value : {};
  const dailySource = isRecord(source.daily) ? source.daily : {};
  const daily = Object.entries(dailySource).reduce<Record<string, InsightDay>>((result, [key, day]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) result[key] = normalizeDay(day);
    return result;
  }, {});

  return {
    version: 1,
    totalSeconds: safeNumber(source.totalSeconds),
    sessions: safeNumber(source.sessions),
    pages: normalizePages(source.pages),
    daily,
    firstTrackedAt: typeof source.firstTrackedAt === 'string' ? source.firstTrackedAt : null,
    lastUpdatedAt: typeof source.lastUpdatedAt === 'string' ? source.lastUpdatedAt : null,
  };
};

const getEntry = (profileId: string): CacheEntry => {
  const existing = cache.get(profileId);
  if (existing) return existing;

  const entry: CacheEntry = {
    data: createEmptyData(),
    loadPromise: null,
    savePromise: Promise.resolve(),
  };
  cache.set(profileId, entry);
  return entry;
};

const ensureLoaded = async (profileId: string) => {
  const entry = getEntry(profileId);
  if (!entry.loadPromise) {
    entry.loadPromise = StorageService.get(`${STORAGE_PREFIX}${profileId}`)
      .then((saved) => {
        if (saved) {
          try {
            entry.data = normalizeData(JSON.parse(saved));
          } catch {
            entry.data = createEmptyData();
          }
        }
      })
      .catch((error) => {
        console.warn('Could not load local spiritual insights', error);
      });
  }
  await entry.loadPromise;
  return entry;
};

const persist = (profileId: string) => {
  const entry = getEntry(profileId);
  entry.savePromise = entry.savePromise
    .catch(() => undefined)
    .then(() => StorageService.set(`${STORAGE_PREFIX}${profileId}`, JSON.stringify(entry.data)))
    .catch((error) => {
      console.warn('Could not save local spiritual insights', error);
    });
  return entry.savePromise;
};

export const toInsightDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const pruneDailyHistory = (data: InsightsData) => {
  const keys = Object.keys(data.daily).sort();
  if (keys.length <= MAX_DAILY_HISTORY) return;
  keys.slice(0, keys.length - MAX_DAILY_HISTORY).forEach((key) => delete data.daily[key]);
};

export async function getInsights(profileId: string): Promise<InsightsData> {
  const entry = await ensureLoaded(profileId);
  return normalizeData(JSON.parse(JSON.stringify(entry.data)));
}

export async function startInsightsSession(profileId: string) {
  const sessionKey = `${profileId}:${appSessionId}`;
  if (countedSessions.has(sessionKey)) return;

  const entry = await ensureLoaded(profileId);
  countedSessions.add(sessionKey);
  entry.data.sessions += 1;
  if (!entry.data.firstTrackedAt) entry.data.firstTrackedAt = new Date().toISOString();
  await persist(profileId);
}

export async function recordInsightTime(
  profileId: string,
  page: InsightPage,
  seconds: number,
  date = new Date(),
) {
  const amount = Math.min(MAX_RECORDED_INTERVAL_SECONDS, Math.max(0, Math.floor(seconds)));
  if (amount < 1) return;

  const entry = await ensureLoaded(profileId);
  const dayKey = toInsightDateKey(date);
  const day = entry.data.daily[dayKey] || createEmptyDay();

  entry.data.totalSeconds += amount;
  entry.data.pages[page] += amount;
  day.totalSeconds += amount;
  day.pages[page] += amount;
  entry.data.daily[dayKey] = day;
  entry.data.lastUpdatedAt = new Date().toISOString();
  if (!entry.data.firstTrackedAt) entry.data.firstTrackedAt = new Date().toISOString();
  pruneDailyHistory(entry.data);
  await persist(profileId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bible-nova-insights-updated'));
  }
}

export const getRecentInsightDays = (data: InsightsData, count = 7): RecentInsightDay[] => {
  const days: RecentInsightDay[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toInsightDateKey(date);
    days.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      ...(data.daily[key] || createEmptyDay()),
    });
  }

  return days;
};

export const getInsightPage = (pathname: string): InsightPage | null => {
  if (pathname === '/') return 'home';
  const page = pathname.replace(/^\//, '').split('/')[0] as InsightPage;
  return INSIGHT_PAGE_ORDER.includes(page) ? page : null;
};
