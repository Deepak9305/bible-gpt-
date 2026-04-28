import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, MessageSquare, BookOpen, Settings, PenLine } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import BannerAd from './BannerAd';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export default function Layout({ isAppReady }: { isAppReady?: boolean }) {
  const { theme, highContrastNav } = useTheme();
  const { pathname } = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const showAd = !isKeyboardVisible && isAppReady;
  const showBannerPadding = !isKeyboardVisible && isAppReady;
  const showNavPadding = !isKeyboardVisible;

  // 9rem (144px) clears the new 90px banner margin + 50px banner height
  const paddingClass = showBannerPadding ? 'pb-[9rem]' : (showNavPadding ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-0');

  React.useEffect(() => {
    let showListener: any;
    let hideListener: any;

    if (Capacitor.isNativePlatform()) {
      let cancelled = false;

      Promise.all([
        Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true)),
        Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false)),
      ]).then(([show, hide]) => {
        if (cancelled) {
          show.remove();
          hide.remove();
          return;
        }
        showListener = show;
        hideListener = hide;
      });

      return () => {
        cancelled = true;
        showListener?.remove();
        hideListener?.remove();
      };
    }
  }, []);

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
    { to: "/journal", icon: PenLine, label: "Journal" },
    { to: "/library", icon: BookOpen, label: "Library" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      <main className={`flex-1 min-h-0 overflow-hidden flex flex-col ${paddingClass} md:pb-0 md:pl-64`}>
        <Outlet />
      </main>

      {/* Banner Ad Component (triggers native ad) */}
      <BannerAd shouldShow={showAd} />

      {/* Mobile Bottom Nav */}
      {!isKeyboardVisible && (
        <nav className={`fixed bottom-0 left-0 right-0 border-t md:hidden backdrop-blur-lg ${theme === 'dark'
          ? 'bg-gray-900/90 border-gray-800'
          : 'bg-white/90 border-gray-200'
          } z-50 pb-[env(safe-area-inset-bottom)]`}>
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full space-y-1 rounded-xl transition-all duration-200 ${isActive
                    ? (highContrastNav
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : (theme === 'dark' ? 'text-blue-400' : 'text-blue-600 scale-105'))
                    : (theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* Desktop Sidebar */}
      <nav className={`hidden md:flex fixed top-0 left-0 bottom-0 w-64 flex-col border-r ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">✝️</span>
            Bible Nova
          </h1>
        </div>
        <div className="flex-1 px-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                  ? (highContrastNav
                    ? 'bg-blue-600 text-white shadow-lg translate-x-1'
                    : (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'))
                  : (theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
}
