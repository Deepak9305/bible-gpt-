import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';

interface User {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginGuest: () => void;
  loginEmail: (email: string) => void;
  logout: () => void;
  deleteAccount: () => void;
  updateProfile: (name: string, avatar?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const loadUser = async () => {
      const storedUser = await StorageService.get('auth_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse user session", e);
          await StorageService.remove('auth_user');
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const loginGuest = async () => {
    const guestUser: User = {
      id: 'guest-' + Date.now(),
      name: 'Guest',
      isGuest: true,
      avatar: '🙏',
    };
    setUser(guestUser);
    await StorageService.set('auth_user', JSON.stringify(guestUser));
  };

  const loginEmail = async (email: string) => {
    // In a real app, this would validate with a backend
    const emailUser: User = {
      id: 'user-' + Date.now(),
      name: email.split('@')[0],
      email: email,
      isGuest: false,
      avatar: '👤',
    };
    setUser(emailUser);
    await StorageService.set('auth_user', JSON.stringify(emailUser));
  };

  const logout = async () => {
    setUser(null);
    await StorageService.remove('auth_user');
  };

  const deleteAccount = async () => {
    await StorageService.clear();
    setUser(null);
    window.location.reload();
  };

  const updateProfile = async (name: string, avatar?: string) => {
    if (user) {
      const updatedUser = { ...user, name, avatar: avatar || user.avatar };
      setUser(updatedUser);
      await StorageService.set('auth_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginGuest, loginEmail, logout, deleteAccount, updateProfile }}>
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
