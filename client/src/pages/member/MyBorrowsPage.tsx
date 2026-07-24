import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate, getRelativeTime, isOverdue, getDaysUntil } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function MyBorrowsPage() {
  const [borrows, setBorrows] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeRes, historyRes] = await Promise.all([
          api.get('/transactions/active'),
          api.get('/transactions/my'),
        ]);
        setBorrows(activeRes.data.borrows || []);
        setHistory(historyRes.data.transactions || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const handleReturn = async (itemId: string) => {
    try {
      await api.post('/transactions/return', { itemId });
      toast.success('Item returned!');
      // Refresh data
      const [activeRes, historyRes] = await Promise.all([
        api.get('/transactions/active'),
        api.get('/transactions/my'),
      ]);
      setBorrows(activeRes.data.borrows || []);
      setHistory(historyRes.data.transactions || []);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Return failed'); }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Borrows</h1>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {(['active', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500')}>
            {t === 'active' ? `Active (${borrows.length})` : 'History'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
      ) : tab === 'active' ? (
        borrows.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No active borrows</p>
            <p className="text-sm text-slate-400 mt-1">Scan a QR code to borrow an item</p>
          </div>
        ) : (
          <div className="space-y-3">
            {borrows.map((b: any, i: number) => {
              const overdue = isOverdue(b.expected_return_date);
              const daysLeft = getDaysUntil(b.expected_return_date);
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={cn('rounded-xl bg-white dark:bg-slate-800 border p-4', overdue ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', overdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-700')}>
                      {overdue ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Package className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{b.item_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{b.item_category}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className={cn('text-xs font-medium', overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
                          {overdue ? `Overdue by ${Math.abs(daysLeft)} day(s)` : `${daysLeft} day(s) left`}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleReturn(b.item_id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                      Return
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No transaction history</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((t: any, i: number) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className={cn('p-1.5 rounded-lg', t.action === 'borrow' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30')}>
                  {t.action === 'borrow' ? <Package className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t.item_name}</p>
                  <p className="text-xs text-slate-400">{t.action === 'borrow' ? 'Borrowed' : 'Returned'} • {getRelativeTime(t.timestamp)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
