import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { loadCloudUserData, saveCloudUserData } from '../services/userDataService';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  highContrastNav: boolean;
  toggleHighContrastNav: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const cloudUserId = user && !user.isGuest ? user.id : null;
  const [theme, setThemeState] = useState<Theme>('light');
  const [highContrastNav, setHighContrastNav] = useState(false);

  useEffect(() => {
    if (authLoading) return undefined;

    let active = true;
    const loadTheme = async () => {
      const savedTheme = await StorageService.get('theme');
      const savedHighContrast = await StorageService.get('highContrastNav') || await StorageService.get('colorBlindMode');
      let nextTheme: Theme = savedTheme === 'dark' ? 'dark' : 'light';
      let nextHighContrast = savedHighContrast === 'true';

      if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        nextTheme = 'dark';
      }

      if (cloudUserId) {
        try {
          const cloudData = await loadCloudUserData(cloudUserId);
          const settings = cloudData?.settings || {};
          const hasCloudTheme = settings.theme === 'light' || settings.theme === 'dark';
          const hasCloudContrast = typeof settings.highContrastNav === 'boolean';

          if (hasCloudTheme) nextTheme = settings.theme as Theme;
          if (hasCloudContrast) nextHighContrast = settings.highContrastNav as boolean;

          if ((!cloudData || (!hasCloudTheme && !hasCloudContrast)) && (savedTheme || savedHighContrast !== null)) {
            await saveCloudUserData(cloudUserId, {
              settings: {
                theme: nextTheme,
                highContrastNav: nextHighContrast,
              },
            });
          }
        } catch (error) {
          console.warn('[Cloud data] Could not load app settings; using the local copy.', error);
        }
      }

      if (!active) return;
      setThemeState(nextTheme);
      setHighContrastNav(nextHighContrast);
    };

    void loadTheme();
    return () => { active = false; };
  }, [authLoading, cloudUserId]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    void StorageService.set('theme', newTheme);
    if (cloudUserId) {
      void saveCloudUserData(cloudUserId, { settings: { theme: newTheme } }).catch((error) => {
        console.warn('[Cloud data] Theme saved locally but not remotely.', error);
      });
    }
  };

  const toggleHighContrastNav = () => {
    setHighContrastNav(prev => {
      const newVal = !prev;
      void StorageService.set('highContrastNav', String(newVal));
      if (cloudUserId) {
        void saveCloudUserData(cloudUserId, { settings: { highContrastNav: newVal } }).catch((error) => {
          console.warn('[Cloud data] Accessibility setting saved locally but not remotely.', error);
        });
      }
      return newVal;
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, highContrastNav, toggleHighContrastNav }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
