import React, { createContext, useContext, useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { setProfileIdForStats } from '../services/statsService';

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

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLocalProfile = async () => {
      const storedProfile = await StorageService.get(PROFILE_KEY);

      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile);
          if (parsed && parsed.id) {
            setProfile(parsed);
            await setProfileIdForStats(parsed.id);
          }
        } catch (e) {
          console.error('Failed to parse local profile', e);
          await StorageService.remove(PROFILE_KEY);
        }
      }

      setIsLoading(false);
    };

    loadLocalProfile();
  }, []);

  const completeOnboarding = async (name: string) => {
    const newProfile: LocalProfile = {
      id: `profile-${Date.now()}`,
      name: name.trim() || 'Beloved',
      avatar: '✝️',
      preferences: {
        isPersonalizationEnabled: true,
      },
    };

    setProfile(newProfile);
    await setProfileIdForStats(newProfile.id);
    await StorageService.set(PROFILE_KEY, JSON.stringify(newProfile));
  };

  const resetProfile = async () => {
    setProfile(null);
    await StorageService.clear().catch(() => {});
    await setProfileIdForStats(null).catch(() => {});
  };

  const updateProfile = async (
    name: string,
    avatar?: string,
    preferences?: LocalProfile['preferences'],
  ) => {
    if (!profile) return;

    const updatedProfile: LocalProfile = {
      ...profile,
      name,
      avatar: avatar || profile.avatar,
      preferences: preferences || profile.preferences,
    };

    setProfile(updatedProfile);
    await StorageService.set(PROFILE_KEY, JSON.stringify(updatedProfile));
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
