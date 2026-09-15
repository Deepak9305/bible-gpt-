import React, { createContext, useContext, useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { completeOnboarding as completeStatsOnboarding, setProfileIdForStats } from '../services/statsService';
import { loadCloudUserData, saveCloudUserData } from '../services/userDataService';
import { useAuth } from './AuthContext';

export interface LocalProfile {
  id: string;
  name: string;
  avatar?: string;
  preferences?: {
    isPersonalizationEnabled: boolean;
    lifeStage?: string;
    spiritualFocus?: string;
    tone?: string;
  };
}

interface ProfileContextType {
  profile: LocalProfile | null;
  isLoading: boolean;
  completeOnboarding: (name: string) => Promise<void>;
  resetProfile: () => Promise<void>;
  updateProfile: (name: string, avatar?: string, preferences?: LocalProfile['preferences']) => Promise<void>;
}

const PROFILE_KEY = 'local_profile';
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeProfile = (value: unknown, fallbackId?: string): LocalProfile | null => {
  if (!isObject(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const id = typeof value.id === 'string' && value.id ? value.id : fallbackId;
  if (!id || !name) return null;

  const rawPreferences = isObject(value.preferences) ? value.preferences : {};
  return {
    id,
    name,
    avatar: typeof value.avatar === 'string' ? value.avatar : undefined,
    preferences: {
      isPersonalizationEnabled: rawPreferences.isPersonalizationEnabled !== false,
      lifeStage: typeof rawPreferences.lifeStage === 'string' ? rawPreferences.lifeStage : undefined,
      spiritualFocus: typeof rawPreferences.spiritualFocus === 'string' ? rawPreferences.spiritualFocus : undefined,
      tone: typeof rawPreferences.tone === 'string' ? rawPreferences.tone : undefined,
    },
  };
};

const canMigrateLegacyProfile = (profileId: string) => (
  profileId.startsWith('guest-') || profileId.startsWith('profile-')
);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return undefined;

    let active = true;
    const accountUserId = user && !user.isGuest ? user.id : null;

    const loadProfile = async () => {
      setIsLoading(true);

      const storedProfileValue = await StorageService.get(PROFILE_KEY);
      let localProfile: LocalProfile | null = null;
      if (storedProfileValue) {
        try {
          localProfile = normalizeProfile(JSON.parse(storedProfileValue));
        } catch (error) {
          console.warn('Could not parse the local profile.', error);
          await StorageService.remove(PROFILE_KEY);
        }
      }

      let nextProfile: LocalProfile | null = null;
      if (accountUserId) {
        try {
          const cloudData = await loadCloudUserData(accountUserId);
          const cloudProfile = normalizeProfile(cloudData?.profile, accountUserId);
          nextProfile = cloudProfile ? { ...cloudProfile, id: accountUserId } : null;

          if (!nextProfile && localProfile && (
            localProfile.id === accountUserId || canMigrateLegacyProfile(localProfile.id)
          )) {
            nextProfile = { ...localProfile, id: accountUserId };
            void saveCloudUserData(accountUserId, { profile: nextProfile }).catch((error) => {
              console.warn('[Cloud data] Could not migrate the local profile.', error);
            });
          }
        } catch (error) {
          console.warn('[Cloud data] Could not load the profile; using the local copy.', error);
          if (localProfile?.id === accountUserId) nextProfile = localProfile;
        }
      } else if (user?.isGuest) {
        nextProfile = localProfile;
      }

      if (!active) return;
      setProfile(nextProfile);
      if (nextProfile) {
        await StorageService.set(PROFILE_KEY, JSON.stringify(nextProfile));
      }
      await setProfileIdForStats(nextProfile?.id ?? null, accountUserId);
      if (active) setIsLoading(false);
    };

    void loadProfile().catch((error) => {
      console.warn('Could not load the profile.', error);
      if (active) {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [authLoading, user?.id, user?.isGuest]);

  const completeOnboarding = async (name: string) => {
    const accountUserId = user && !user.isGuest ? user.id : null;
    const newProfile: LocalProfile = {
      id: accountUserId || `profile-${Date.now()}`,
      name: name.trim() || 'Beloved',
      avatar: '✝️',
      preferences: {
        isPersonalizationEnabled: true,
      },
    };

    setProfile(newProfile);
    await setProfileIdForStats(newProfile.id, accountUserId);
    completeStatsOnboarding(newProfile.name);
    await StorageService.set(PROFILE_KEY, JSON.stringify(newProfile));

    if (accountUserId) {
      try {
        await saveCloudUserData(accountUserId, { profile: newProfile });
      } catch (error) {
        console.warn('[Cloud data] Profile saved locally but not remotely.', error);
      }
    }
  };

  const resetProfile = async () => {
    setProfile(null);
    await StorageService.remove(PROFILE_KEY).catch(() => {});
    await setProfileIdForStats(null, null).catch(() => {});
  };

  const updateProfile = async (
    name: string,
    avatar?: string,
    preferences?: LocalProfile['preferences'],
  ) => {
    if (!profile) return;

    const updatedProfile: LocalProfile = {
      ...profile,
      name: name.trim() || profile.name,
      avatar: avatar || profile.avatar,
      preferences: preferences || profile.preferences,
    };

    setProfile(updatedProfile);
    await StorageService.set(PROFILE_KEY, JSON.stringify(updatedProfile));

    if (user && !user.isGuest) {
      try {
        await saveCloudUserData(user.id, { profile: updatedProfile });
      } catch (error) {
        console.warn('[Cloud data] Profile updated locally but not remotely.', error);
      }
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        completeOnboarding,
        resetProfile,
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
