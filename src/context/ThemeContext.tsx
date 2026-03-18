import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';

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
  const [theme, setThemeState] = useState<Theme>('light');
  const [highContrastNav, setHighContrastNav] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      // Load Theme
      const savedTheme = await StorageService.get('theme');
      if (savedTheme) {
        setThemeState(savedTheme as Theme);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setThemeState('dark');
      }

      // Load High Contrast Nav (checking old key for backward compatibility)
      const savedHighContrast = await StorageService.get('highContrastNav') || await StorageService.get('colorBlindMode');
      if (savedHighContrast !== null) {
        setHighContrastNav(String(savedHighContrast) === 'true');
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    StorageService.set('theme', newTheme);
  };

  const toggleHighContrastNav = () => {
    setHighContrastNav(prev => {
      const newVal = !prev;
      StorageService.set('highContrastNav', String(newVal));
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
