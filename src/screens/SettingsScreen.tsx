import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Trash2, Github } from 'lucide-react';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();

  const clearData = () => {
    if (confirm('Are you sure you want to clear all bookmarks and settings?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Appearance */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 px-2">Appearance</h2>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                <span>Dark Mode</span>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 px-2">Data</h2>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <button 
              onClick={clearData}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-red-500"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={20} />
                <span>Clear All Data</span>
              </div>
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 px-2">About</h2>
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className="mb-4 opacity-80">
              Bible GPT is your spiritual companion, designed to provide comfort and guidance through Scripture.
            </p>
            <div className="flex items-center gap-2 opacity-60 text-sm">
              <span>Version 1.0.0</span>
            </div>
            <a 
              href="https://github.com/rizzmasterhelpteam/bible-gpt" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-blue-500 hover:underline"
            >
              <Github size={16} />
              <span>View on GitHub</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
