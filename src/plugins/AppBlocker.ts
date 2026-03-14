import { registerPlugin } from '@capacitor/core';

export interface AppBlockerPlugin {
  /** 
   * Requests OS-level permissions to manage screen time/usage.
   * iOS: Requests Family Controls permission.
   * Android: Opens Usage Access settings.
   */
  requestPermissions(): Promise<{ granted: boolean }>;
  
  /** 
   * Blocks specific apps (by bundle ID) for a set duration.
   * @param options.appBundleIds Array of bundle IDs (e.g., ['com.instagram.android', 'com.zhiliaoapp.musically'])
   * @param options.durationMinutes How long to block the apps
   */
  blockApps(options: { appBundleIds: string[], durationMinutes: number }): Promise<void>;
  
  /** 
   * Removes all active blocks.
   */
  unblockApps(): Promise<void>;
}

export const AppBlocker = registerPlugin<AppBlockerPlugin>('AppBlocker');
