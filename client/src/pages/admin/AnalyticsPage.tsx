import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Trophy, BarChart3 } from 'lucide-react';
import api from '@/lib/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#ec4899'];

export default function AnalyticsPage() {
  const [trend, setTrend] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [topBorrowed, setTopBorrowed] = useState<any[]>([]);
  const [clubUsage, setClubUsage] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendRes, catRes, topRes, clubRes] = await Promise.all([
          api.get('/analytics/borrow-trend'),
          api.get('/analytics/category-distribution'),
          api.get('/analytics/top-borrowed'),
          api.get('/analytics/club-usage'),
        ]);
        setTrend(trendRes.data.trend || []);
        setCategories(catRes.data.distribution || []);
        setTopBorrowed(topRes.data.topBorrowed || []);
        setClubUsage(clubRes.data.usage || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="space-y-6 max-w-7xl mx-auto">{[1, 2, 3].map(i => <div key={i} className="h-72 skeleton" />)}</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Analytics & Insights</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Comprehensive breakdown of inventory usage and borrowing trends</p>
      </div>

      {/* Borrow Trend */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">30-Day Borrow Trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient>
              <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="borrows" stroke="#4f46e5" fill="url(#bGrad)" strokeWidth={2} name="Borrows" />
            <Area type="monotone" dataKey="returns" stroke="#10b981" fill="url(#rGrad)" strokeWidth={2} name="Returns" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} label={(entry: any) => `${entry.category}: ${entry.count}`}>
                {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Borrowed Leaderboard */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Most Borrowed Equipment</h3>
          </div>
          <div className="space-y-3">
            {topBorrowed.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No transaction data yet</p>
            ) : (
              topBorrowed.map((item: any, i: number) => (
                <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.category}</p>
                    </div>
                  </div>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.borrow_count} borrows</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Club Utilization */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Club Activity Volume</h3>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={clubUsage} barCategoryGap="25%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
            <XAxis dataKey="club" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="borrows" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Borrows" />
            <Bar dataKey="returns" fill="#10b981" radius={[4, 4, 0, 0]} name="Returns" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
