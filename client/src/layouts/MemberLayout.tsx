import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, Package, Home, User, Moon, Sun, LogOut, Boxes } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/member' },
  { icon: Search, label: 'Find Item', path: '/member/scan' },
  { icon: Package, label: 'Borrows', path: '/member/borrows' },
  { icon: User, label: 'Profile', path: '/member/profile' },
];

export default function MemberLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white font-bold">
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-slate-900 dark:text-white">Smart Inventory</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleTheme} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Toggle Theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={logout} className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Log Out">
            <LogOut className="w-4 h-4" />
          </button>
          <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 text-[10px] font-bold">
            {getInitials(user?.name || 'M')}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="flex items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
