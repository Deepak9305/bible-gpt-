import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorBlindMode: boolean;
  toggleColorBlindMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [colorBlindMode, setColorBlindMode] = useState<boolean>(false);

  useEffect(() => {
    const loadSettings = async () => {
      // Load Theme
      const savedTheme = await StorageService.get('theme') as Theme;
      if (savedTheme) {
        setTheme(savedTheme);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }

      // Load Color Blind Mode
      const savedColorBlind = await StorageService.get('colorBlindMode');
      if (savedColorBlind !== null) {
        setColorBlindMode(String(savedColorBlind) === 'true');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    StorageService.set('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    StorageService.set('colorBlindMode', colorBlindMode);
  }, [colorBlindMode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleColorBlindMode = () => {
    setColorBlindMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorBlindMode, toggleColorBlindMode }}>
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
