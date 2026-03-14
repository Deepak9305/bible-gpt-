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
    { to: "/chat", icon: MessageSquare, label: "Chat" },
    { to: "/library", icon: BookOpen, label: "Library" },
    { to: "/bookmarks", icon: Bookmark, label: "Saved" },
    { to: "/journal", icon: PenLine, label: "Journal" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* Sticky Switch IDs Button & Popup */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className={`p-2 rounded-full shadow-lg transition-all active:scale-95 ${theme === 'dark'
            ? 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          title="Switch Account"
        >
          <Users size={20} />
        </button>

        <AnimatePresence>
          {isAccountMenuOpen && (
            <div key="account-menu" className="fixed inset-0 z-40">
              <div
                className="absolute inset-0"
                onClick={() => setIsAccountMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                transition={{ duration: 0.1 }}
                className={`absolute right-4 top-16 w-64 rounded-2xl shadow-2xl border z-50 overflow-hidden ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
                  }`}
              >
                <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-1">Current Account</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      <User size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user?.name || 'Guest'}</p>
                      <p className="text-xs opacity-60 truncate">{user?.email || 'Guest User'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={handleAddAccount}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${theme === 'dark'
                      ? 'hover:bg-gray-700 text-gray-300'
                      : 'hover:bg-gray-50 text-gray-700'
                      }`}
                  >
                    <Plus size={16} />
                    <span>Add another account</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-red-500 ${theme === 'dark'
                      ? 'hover:bg-red-900/20'
                      : 'hover:bg-red-50'
                      }`}
                  >
                    <LogOut size={16} />
                    <span>Log out</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 md:pl-64">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
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
                  ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600 scale-105')
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

      {/* Desktop Sidebar */}
      <nav className={`hidden md:flex fixed top-0 left-0 bottom-0 w-64 flex-col border-r ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            🙏 Bible Nova
          </h1>
        </div>
        <div className="flex-1 px-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600')
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
