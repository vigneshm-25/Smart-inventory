import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Calendar, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { capitalize, cn, getRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function FindItemPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemIdParam = searchParams.get('id');

  const [searchQuery, setSearchQuery] = useState('');
  const [manualIdInput, setManualIdInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Borrow Modal State
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate.toISOString().split('T')[0];
  });
  const [borrowNotes, setBorrowNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all catalog items & categories
  const fetchCatalog = async () => {
    try {
      const [itemsRes, catRes] = await Promise.all([
        api.get('/items', { params: { search: searchQuery, category: categoryFilter } }),
        api.get('/items/categories/list'),
      ]);
      setItems(itemsRes.data.items || []);
      setCategories(catRes.data.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [searchQuery, categoryFilter]);

  // Handle URL item parameter lookup if provided
  useEffect(() => {
    if (itemIdParam) {
      handleFindById(itemIdParam);
    }
  }, [itemIdParam]);

  // Lookup single item by Item ID (e.g., ITM-001)
  const handleFindById = async (idToSearch: string) => {
    const cleanId = idToSearch.trim();
    if (!cleanId) return;

    setIsSearching(true);
    try {
      const { data } = await api.get(`/items/${encodeURIComponent(cleanId)}`);
      setSelectedItem(data.item);
      setSearchParams({ id: data.item.qr_code_id || data.item.id });
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Item "${cleanId}" not found`);
    } finally {
      setIsSearching(false);
    }
  };

  // Submit Borrow
  const handleConfirmBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      await api.post('/transactions/borrow', {
        itemId: selectedItem.id,
        expectedReturnDate,
        notes: borrowNotes || undefined,
      });
      toast.success(`Successfully borrowed "${selectedItem.name}"!`);
      setShowBorrowModal(false);
      setBorrowNotes('');
      // Refresh item state
      await handleFindById(selectedItem.id);
      await fetchCatalog();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to borrow item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Return
  const handleConfirmReturn = async () => {
    if (!selectedItem) return;
    if (!confirm(`Confirm returning "${selectedItem.name}"?`)) return;

    setIsSubmitting(true);
    try {
      await api.post('/transactions/return', {
        itemId: selectedItem.id,
        notes: 'Returned by member',
      });
      toast.success(`Successfully returned "${selectedItem.name}"!`);
      // Refresh item state
      await handleFindById(selectedItem.id);
      await fetchCatalog();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to return item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Find Equipment</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Search by name or enter an Item ID directly to borrow or return</p>
      </div>

      {/* ── Method A: Direct Item ID Lookup Input ────────────────────── */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Direct Item ID Lookup
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualIdInput}
            onChange={e => setManualIdInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFindById(manualIdInput)}
            placeholder="Type ID (e.g., ITM-001)"
            className="flex-1 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white uppercase outline-none focus:border-teal-600 transition-colors"
          />
          <button
            onClick={() => handleFindById(manualIdInput)}
            disabled={isSearching || !manualIdInput.trim()}
            className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
          </button>
        </div>
      </div>

      {/* ── Selected Item Details Card ──────────────────────────────── */}
      {selectedItem && (
        <div className="p-4 rounded-lg border-2 border-teal-600/40 dark:border-teal-500/40 bg-teal-50/20 dark:bg-teal-950/10 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-teal-600 text-white text-[10px] font-mono font-bold">
                  {selectedItem.qr_code_id || 'ITM-001'}
                </span>
                <span className={cn('badge-status', `badge-${selectedItem.status}`)}>
                  <span className={cn('status-dot', selectedItem.status)} />
                  {capitalize(selectedItem.status)}
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-1.5">{selectedItem.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedItem.category} • {selectedItem.owning_club}</p>
            </div>
            <button
              onClick={() => { setSelectedItem(null); setSearchParams({}); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          </div>

          {selectedItem.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-200/60 dark:border-slate-800/60">
              {selectedItem.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Storage Location</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{selectedItem.storage_location || 'Storage Room'}</span>
            </div>
            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Condition</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{capitalize(selectedItem.condition)}</span>
            </div>
          </div>

          {/* Current Holder Status if Borrowed */}
          {selectedItem.status === 'borrowed' && (
            <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <div>
                <span className="font-semibold">Current Holder:</span> {selectedItem.current_holder || 'Club Member'}
                {selectedItem.return_date && (
                  <span className="block text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Due: {new Date(selectedItem.return_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {selectedItem.status === 'available' ? (
              <button
                onClick={() => setShowBorrowModal(true)}
                className="w-full py-2.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                Borrow Item <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : selectedItem.status === 'borrowed' ? (
              <button
                onClick={handleConfirmReturn}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                Return Item Now
              </button>
            ) : (
              <button disabled className="w-full py-2.5 rounded bg-slate-200 text-slate-500 text-xs font-medium cursor-not-allowed">
                Item Unavailable ({capitalize(selectedItem.status)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Method B: Searchable Catalog List ───────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Equipment Catalog</h2>
          <span className="text-[11px] text-slate-400">{items.length} items</span>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search catalog by name..."
              className="bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none w-full"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Items List */}
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 skeleton" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Package className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <p className="text-xs text-slate-500">No equipment matches your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((itm) => (
              <div
                key={itm.id}
                className={cn(
                  'p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-between gap-3 transition-colors',
                  selectedItem?.id === itm.id
                    ? 'border-teal-600 dark:border-teal-500 bg-teal-50/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold shrink-0">
                    {itm.qr_code_id || 'ITM-001'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{itm.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{itm.category} • {itm.owning_club}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('badge-status hidden sm:inline-flex', `badge-${itm.status}`)}>
                    {capitalize(itm.status)}
                  </span>
                  <button
                    onClick={() => { setSelectedItem(itm); setSearchParams({ id: itm.qr_code_id || itm.id }); }}
                    className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Borrow Modal ───────────────────────────────────────────── */}
      {showBorrowModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowBorrowModal(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Borrow Equipment</h3>
              <p className="text-xs text-slate-500 mt-0.5">Confirm borrowing "{selectedItem.name}" ({selectedItem.qr_code_id})</p>
            </div>

            <form onSubmit={handleConfirmBorrow} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" /> Expected Return Date *
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setExpectedReturnDate(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Purpose (Optional)</label>
                <textarea
                  value={borrowNotes}
                  onChange={e => setBorrowNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Needed for Cultural Fest video shoot"
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBorrowModal(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Confirming...' : 'Confirm Borrow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
