import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { setUserIdForStats } from '../services/statsService';

interface User {
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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  completeOnboarding: (name: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (name: string, avatar?: string, preferences?: User['preferences']) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLocalUser = async () => {
      const storedUser = await StorageService.get('auth_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.id) {
            setUser(parsed);
            await setUserIdForStats(parsed.id);
          }
        } catch (e) {
          console.error('Failed to parse user session', e);
          await StorageService.remove('auth_user');
        }
      }
      setIsLoading(false);
    };

    loadLocalUser();
  }, []);

  const completeOnboarding = async (name: string) => {
    const newUser: User = {
      id: 'user-' + Date.now(),
      name: name.trim() || 'Beloved',
      avatar: '✝️',
      preferences: {
        isPersonalizationEnabled: true,
      }
    };
    setUser(newUser);
    await setUserIdForStats(newUser.id);
    await StorageService.set('auth_user', JSON.stringify(newUser));
  };

  const deleteAccount = async () => {
    try {
      setUser(null);
      await StorageService.clear().catch(() => { });
      await setUserIdForStats(null).catch(() => { });
    } catch (err) {
      console.error('deleteAccount failed:', err);
    }
  };

  const updateProfile = async (name: string, avatar?: string, preferences?: User['preferences']) => {
    if (user) {
      const updatedUser = {
        ...user,
        name,
        avatar: avatar || user.avatar,
        preferences: preferences || user.preferences
      };
      setUser(updatedUser);
      await StorageService.set('auth_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      completeOnboarding,
      deleteAccount,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
