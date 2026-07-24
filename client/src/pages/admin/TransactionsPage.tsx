import { useState, useEffect } from 'react';
import { ArrowLeftRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDateTime, capitalize, isOverdue } from '@/lib/utils';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params: any = {};
        if (filter) params.action = filter;
        const { data } = await api.get('/transactions', { params });
        setTransactions(data.transactions || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [filter]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Transaction Log</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Audit history of equipment borrowing and returns</p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="">All Actions</option>
          <option value="borrow">Borrows Only</option>
          <option value="return">Returns Only</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3.5"><div className="h-6 skeleton" /></td></tr>)
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <ArrowLeftRight className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">No transactions recorded yet</p>
                </td>
              </tr>
            ) : (
              transactions.map((t: any) => {
                const overdue = t.action === 'borrow' && isOverdue(t.expected_return_date) && !t.actual_return_date;
                return (
                  <tr key={t.id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors', overdue && 'bg-red-50/30 dark:bg-red-950/20')}>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium',
                        t.action === 'borrow' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400')}>
                        {t.action === 'borrow' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {capitalize(t.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t.item_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{t.user_name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{formatDateTime(t.timestamp)}</td>
                    <td className="px-4 py-3">
                      {t.expected_return_date ? (
                        <span className={cn('text-[11px]', overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500')}>
                          {formatDateTime(t.expected_return_date)}
                          {overdue && ' (OVERDUE)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 max-w-[200px] truncate">{t.notes || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
