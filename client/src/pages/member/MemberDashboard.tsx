import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getRelativeTime } from '@/lib/utils';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [activeBorrows, setActiveBorrows] = useState<any[]>([]);
  const [stats, setStats] = useState({ active: 0, returned: 0, score: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [borrowsRes, txRes] = await Promise.all([
          api.get('/transactions/active'),
          api.get('/transactions/my'),
        ]);
        setActiveBorrows(borrowsRes.data.borrows || []);
        const transactions = txRes.data.transactions || [];
        setStats({
          active: (borrowsRes.data.borrows || []).length,
          returned: transactions.filter((t: any) => t.action === 'return').length,
          score: user?.reliabilityScore || 100,
        });
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [user]);

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* Plain Header — No gradient banner, no colored background box */}
      <div className="pt-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Welcome back, {user?.name}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {user?.club || 'Club Member'}
        </p>
      </div>

      {/* Quick Find CTA — Simple button with muted teal accent */}
      <Link to="/member/scan" className="block">
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Find Equipment</p>
              <p className="text-xs text-slate-500">Search catalog or enter an Item ID</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium flex items-center gap-1 transition-colors">
            Find <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Link>

      {/* Minimal Stat Cards — Plain number + label, no colored icon badge boxes */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
          <p className="text-xs text-slate-500 mt-0.5">Active Loans</p>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.returned}</p>
          <p className="text-xs text-slate-500 mt-0.5">Returned</p>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.score}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Score</p>
        </div>
      </div>

      {/* Active Borrows List */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Your Borrowed Equipment</h2>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 skeleton" />)}</div>
        ) : activeBorrows.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs text-slate-500">No active borrowed items right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeBorrows.map((b: any) => (
              <div key={b.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.item_name}</p>
                    <p className="text-[11px] text-slate-500">{b.item_category} • Borrowed {getRelativeTime(b.timestamp)}</p>
                  </div>
                </div>
                <Link to="/member/borrows" className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
                  Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
