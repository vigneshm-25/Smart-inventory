import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard, Package, ArrowLeftRight, BarChart3, Users,
  Search, Moon, Sun, Menu, LogOut, Boxes, QrCode, Bot, Sparkles, FileText
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Package, label: 'Inventory', path: '/admin/inventory' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/admin/transactions' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Bot, label: 'AI Assistant', path: '/admin/ai-assistant' },
  { icon: Sparkles, label: 'Equipment Planner', path: '/admin/planner' },
  { icon: FileText, label: 'Reports', path: '/admin/reports' },
  { icon: Users, label: 'Users', path: '/admin/users' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] transition-all duration-200 z-20 shrink-0',
          sidebarOpen ? 'w-56' : 'w-16'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 h-13 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-teal-600 text-white shrink-0 font-bold">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-xs text-slate-900 dark:text-white tracking-tight">
                Smart Inventory
              </span>
            )}
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-400 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500')} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 text-[10px] font-bold shrink-0">
                {getInitials(user?.name || 'A')}
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <p className="text-[11px] font-medium text-slate-900 dark:text-white truncate leading-none">{user?.name}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">{user?.role}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={logout}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Viewport ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-5 h-13 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Filter Search */}
            <div className="relative hidden md:flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
              <input
                type="text"
                placeholder="Search catalog, members..."
                className="pl-8 pr-3 py-1 rounded bg-slate-100 dark:bg-slate-800/60 border border-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none w-56 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-300 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/member/scan"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              Mobile Scan View
            </Link>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Body Viewport */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
