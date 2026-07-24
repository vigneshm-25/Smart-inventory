import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Package, CheckCircle2, Clock, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { cn, getRelativeTime } from '@/lib/utils';
import type { DashboardSummary, BorrowTrendPoint, CategoryDistribution, ClubUsage, ActivityItem } from '@/types';

const CHART_COLORS = ['#0d9488', '#2563eb', '#d97706', '#0284c7', '#475569', '#dc2626'];

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<BorrowTrendPoint[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [clubUsage, setClubUsage] = useState<ClubUsage[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, trendRes, catRes, clubRes, actRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/borrow-trend'),
        api.get('/analytics/category-distribution'),
        api.get('/analytics/club-usage'),
        api.get('/analytics/recent-activity'),
      ]);
      setSummary(summaryRes.data.summary);
      setTrend(trendRes.data.trend || []);
      setCategories(catRes.data.distribution || []);
      setClubUsage(clubRes.data.usage || []);
      setActivity(actRes.data.activity || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Socket.io real-time update
  useEffect(() => {
    if (!socket) return;
    socket.on('dashboard:refresh', () => fetchData());
    return () => { socket.off('dashboard:refresh'); };
  }, [socket, fetchData]);

  const kpiCards = summary ? [
    { label: 'Total Catalog', value: summary.totalItems, icon: Package, badge: 'All items' },
    { label: 'Available Items', value: summary.available, icon: CheckCircle2, badge: 'Ready' },
    { label: 'Active Loans', value: summary.borrowed, icon: Clock, badge: 'Borrowed' },
    { label: 'Overdue Items', value: summary.overdue, icon: AlertTriangle, badge: summary.overdue > 0 ? 'Action needed' : 'Clear' },
  ] : [];

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 skeleton" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 skeleton" />
          <div className="h-72 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status of university equipment and active borrows</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Simplified Plain Stat Cards — No colored icon badge boxes, pure minimal text + number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</span>
              <span className="text-[11px] text-slate-500 font-medium">{kpi.badge}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Borrow Activity Trend */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Borrow & Return Activity</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">30-day transaction volume</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="borrows" stroke="#0d9488" fill="url(#tealGrad)" strokeWidth={2} name="Borrows" />
              <Area type="monotone" dataKey="returns" stroke="#2563eb" fill="transparent" strokeWidth={2} name="Returns" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Category Distribution</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Items grouped by equipment type</p>
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={190}>
              <PieChart>
                <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={40} outerRadius={70} strokeWidth={2}>
                  {categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 pr-2">
              {categories.map((cat, i) => (
                <div key={cat.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400">{cat.category}</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Club Usage */}
        <div className="lg:col-span-2 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Club Activity</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Transactions by organization</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={clubUsage} barCategoryGap="25%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
              <XAxis dataKey="club" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="borrows" fill="#0d9488" radius={[2, 2, 0, 0]} name="Borrows" />
              <Bar dataKey="returns" fill="#2563eb" radius={[2, 2, 0, 0]} name="Returns" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Activity Stream */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Recent Activity</h3>
          <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
            {activity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent activity</p>
            ) : (
              activity.slice(0, 6).map((act) => (
                <div key={act.id} className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 text-slate-500 shrink-0">
                    {act.action === 'borrow' ? <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-white leading-tight">
                      <span className="font-semibold">{act.user_name}</span>{' '}
                      <span className="text-slate-500">{act.action === 'borrow' ? 'borrowed' : 'returned'}</span>{' '}
                      <span className="font-medium">{act.item_name}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{getRelativeTime(act.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
