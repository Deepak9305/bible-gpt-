import { Preferences } from '@capacitor/preferences';

export const StorageService = {
  async get(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (e) {
      console.warn(`Failed to get ${key} from Preferences, falling back to localStorage`, e);
      return localStorage.getItem(key);
    }
  },
  
  async set(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      console.warn(`Failed to set ${key} in Preferences, falling back to localStorage`, e);
      localStorage.setItem(key, value);
    }
  },
  
  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (e) {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (e) {
      localStorage.clear();
    }
  }
};
