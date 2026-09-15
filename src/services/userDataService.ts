import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface CloudUserData {
  user_id: string;
  profile: Record<string, unknown>;
  bookmarks: unknown[];
  prayers: unknown[];
  insights: Record<string, unknown>;
  settings: Record<string, unknown>;
  voice: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type CloudUserDataPatch = Partial<{
  profile: unknown;
  bookmarks: unknown;
  prayers: unknown;
  insights: unknown;
  settings: unknown;
  voice: unknown;
}>;

const DATA_COLUMNS = 'user_id, profile, bookmarks, prayers, insights, settings, voice, created_at, updated_at';

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isUuid = (value: string) => (
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
);

const normalizeRow = (row: Partial<CloudUserData>): CloudUserData | null => {
  if (!row.user_id || !isUuid(row.user_id)) return null;
  return {
    user_id: row.user_id,
    profile: isObject(row.profile) ? row.profile : {},
    bookmarks: Array.isArray(row.bookmarks) ? row.bookmarks : [],
    prayers: Array.isArray(row.prayers) ? row.prayers : [],
    insights: isObject(row.insights) ? row.insights : {},
    settings: isObject(row.settings) ? row.settings : {},
    voice: isObject(row.voice) ? row.voice : {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const loadCloudUserData = async (userId: string): Promise<CloudUserData | null> => {
  if (!isSupabaseConfigured || !isUuid(userId)) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select(DATA_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeRow(data as Partial<CloudUserData>) : null;
};

export const saveCloudUserData = async (userId: string, patch: CloudUserDataPatch): Promise<void> => {
  if (!isSupabaseConfigured || !isUuid(userId) || Object.keys(patch).length === 0) return;

  // Settings and voice are updated one property at a time from the UI. Merge
  // those JSON objects first so changing one toggle/control cannot erase the
  // user's other saved preference.
  let nextPatch = patch;
  if (isObject(patch.settings) || isObject(patch.voice)) {
    const current = await loadCloudUserData(userId);
    nextPatch = {
      ...patch,
      ...(isObject(patch.settings) ? { settings: { ...current?.settings, ...patch.settings } } : {}),
      ...(isObject(patch.voice) ? { voice: { ...current?.voice, ...patch.voice } } : {}),
    };
  }

  const { error } = await supabase
    .from('user_data')
    .upsert({
      user_id: userId,
      ...nextPatch,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;
};

export const getAuthenticatedUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[Cloud data] Could not read the current session.', error.message);
    return null;
  }
  return data.session?.user.id ?? null;
};

export const saveCloudFieldForCurrentUser = async <K extends keyof CloudUserDataPatch>(
  field: K,
  value: NonNullable<CloudUserDataPatch[K]>,
) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;
  await saveCloudUserData(userId, { [field]: value } as CloudUserDataPatch);
};
