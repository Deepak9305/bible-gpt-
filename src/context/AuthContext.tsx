import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user session", e);
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const loginGuest = () => {
    const guestUser: User = {
      id: 'guest-' + Date.now(),
      name: 'Guest',
      isGuest: true,
      avatar: '🙏',
    };
    setUser(guestUser);
    localStorage.setItem('auth_user', JSON.stringify(guestUser));
  };

  const loginEmail = (email: string) => {
    // In a real app, this would validate with a backend
    const emailUser: User = {
      id: 'user-' + Date.now(),
      name: email.split('@')[0],
      email: email,
      isGuest: false,
      avatar: '👤',
    };
    setUser(emailUser);
    localStorage.setItem('auth_user', JSON.stringify(emailUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const deleteAccount = () => {
    localStorage.clear();
    setUser(null);
    window.location.reload();
  };

  const updateProfile = (name: string, avatar?: string) => {
    if (user) {
      const updatedUser = { ...user, name, avatar: avatar || user.avatar };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
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
