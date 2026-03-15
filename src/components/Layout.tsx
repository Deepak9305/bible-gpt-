import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, MessageSquare, BookOpen, Bookmark, Settings, PenLine, Users, LogOut, Plus, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsAccountMenuOpen(false);
  };

  const handleAddAccount = () => {
    logout();
    setIsAccountMenuOpen(false);
  };

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/chat", icon: MessageSquare, label: "Father AI" },
    { to: "/library", icon: BookOpen, label: "Scripture" },
    { to: "/bookmarks", icon: Bookmark, label: "Treasury" },
    { to: "/journal", icon: PenLine, label: "Journal" },
  ];

  return (
    <div className={`min-h-screen flex flex-col organic-glow ${theme === 'dark' ? 'premium-gradient-dark text-stone-100' : 'premium-gradient text-stone-900'}`}>

      {/* Account Menu Trigger (Floating) */}
      <div className="fixed top-safe-4 right-4 z-50">
        <button
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className={`p-2.5 rounded-2xl shadow-xl transition-all active:scale-95 ${theme === 'dark'
            ? 'glass-dark text-amber-500 border-white/10'
            : 'glass-light text-amber-600 border-amber-500/10'
            }`}
        >
          <User size={22} strokeWidth={2.5} />
        </button>

        <AnimatePresence>
          {isAccountMenuOpen && (
            <div key="account-menu" className="fixed inset-0 z-40">
              <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-sm" onClick={() => setIsAccountMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                className={`absolute right-4 top-20 w-72 rounded-[2rem] shadow-2xl border overflow-hidden p-2 ${theme === 'dark'
                  ? 'glass-dark'
                  : 'glass-light'
                  }`}
              >
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-3">Your Identity</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600'}`}>
                      <User size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg truncate leading-none">{user?.name || 'Guest'}</p>
                      <p className="text-xs opacity-50 truncate mt-1">{user?.email || 'Spiritual Voyager'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={handleAddAccount}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all hover:bg-amber-500/10"
                  >
                    <Plus size={18} />
                    <span>Add New Account</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 transition-all hover:bg-red-500/10"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <main className="flex-1 relative overflow-x-hidden overflow-y-auto pb-32 md:pb-0 md:pl-64">
        <Outlet />
      </main>

      {/* Premium Floating Mobile Bottom Nav */}
      <div className="fixed bottom-8 left-6 right-6 md:hidden z-50">
        <nav className={`rounded-[2.8rem] p-2 flex justify-around items-center border shadow-[0_15px_50px_-15px_rgba(0,0,0,0.3)] ${theme === 'dark'
          ? 'glass-dark'
          : 'glass-light'
          }`}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-500 flex-1 ${isActive
                  ? 'text-amber-600 scale-105'
                  : 'text-stone-400 hover:text-stone-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className={`absolute inset-0 rounded-[1.8rem] z-0 ${theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100/50'} shadow-inner`}
                      transition={{ type: "spring", bounce: 0.15, duration: 0.7 }}
                    />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                  <span className={`text-[8px] font-black uppercase tracking-widest mt-1 relative z-10 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Desktop Sidebar (Enhanced) */}
      <nav className={`hidden md:flex fixed top-0 left-0 bottom-0 w-64 flex-col border-r ${theme === 'dark' ? 'bg-stone-900 border-white/5' : 'bg-white border-stone-100'}`}>
        <div className="p-8">
          <h1 className="text-2xl font-black font-serif italic flex items-center gap-3">
            🙏 Bible Nova
          </h1>
        </div>
        <div className="flex-1 px-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${isActive
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-white/5'
                }`
              }
            >
              <Icon size={20} strokeWidth={2.5} />
              <span className="font-bold">{label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${isActive
                ? 'bg-stone-200 text-stone-900'
                : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-white/5'
              }`
            }
          >
            <Settings size={20} strokeWidth={2.5} />
            <span className="font-bold">Settings</span>
          </NavLink>
        </div>
      </nav>

    </div>
  );
}
