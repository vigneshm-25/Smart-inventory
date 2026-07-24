import { useState, useEffect } from 'react';
import { Users as UsersIcon, Shield, Star } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate, getInitials } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/users');
        setUsers(data.users || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Members & Roles</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage user access privileges, clubs, and reliability scores</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">Reliability</th>
              <th className="px-4 py-3">Borrow Stats</th>
              <th className="px-4 py-3">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3.5"><div className="h-6 skeleton" /></td></tr>)
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">No registered users found</p>
                </td>
              </tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium',
                      u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400')}>
                      {u.role === 'admin' && <Shield className="w-3 h-3 text-indigo-600" />}
                      {u.role === 'admin' ? 'Admin' : 'Student / Member'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{u.club || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', u.reliability_score >= 80 ? 'bg-emerald-500' : u.reliability_score >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${u.reliability_score}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400">{u.reliability_score}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{u.active_borrows}</span> active / {u.total_borrows} total
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">{formatDate(u.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
