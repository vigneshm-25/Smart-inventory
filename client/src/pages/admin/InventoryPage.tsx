import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Edit2, X, Package, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { cn, capitalize } from '@/lib/utils';
import type { Item, CreateItemData } from '@/types';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Camera',
  'Speaker',
  'Projector',
  'Laptop',
  'Electronics',
  'Sports',
  'Lighting',
  'Audio',
  'Electrical',
  'Computing',
  'Accessories',
  'Presentation',
  'Stationery',
  'Other',
];

const CONDITIONS = [
  { value: 'excellent', label: 'New / Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Damaged / Poor' },
];

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Slide-over side panel state
  const [showAddSlideOver, setShowAddSlideOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  // Form state
  const [form, setForm] = useState<CreateItemData>({
    name: '',
    category: 'Camera',
    description: '',
    owningClub: '',
    condition: 'good',
    quantity: 1,
    storageLocation: '',
  });

  const fetchItems = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await api.get('/items', { params });
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [search, statusFilter, categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || !form.owningClub.trim()) {
      toast.error('Please fill in all required fields (Name, Category, Owning Club)');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/items', form);
      const generatedId = data.itemId || data.item?.qr_code_id || 'ITM-NEW';
      toast.success(`Equipment created! Assigned Item ID: ${generatedId}`);
      setShowAddSlideOver(false);
      setForm({
        name: '',
        category: 'Camera',
        description: '',
        owningClub: '',
        condition: 'good',
        quantity: 1,
        storageLocation: '',
      });
      await fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      await api.put(`/items/${editItem.id}`, {
        name: editItem.name,
        category: editItem.category,
        description: editItem.description,
        owningClub: editItem.owning_club,
        condition: editItem.condition,
        quantity: editItem.quantity,
        storageLocation: editItem.storage_location,
        status: editItem.status,
      });
      toast.success('Item updated!');
      setEditItem(null);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update item');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/items/${id}`);
      toast.success('Item deleted');
      fetchItems();
    } catch {
      toast.error('Failed to delete item');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Equipment Catalog</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage club equipment, track status, and assign Item IDs</p>
        </div>
        
        {/* + Add Item Primary Button with Muted Teal Accent */}
        <button
          onClick={() => setShowAddSlideOver(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search catalog by name, description, or Item ID (e.g. ITM-001)..."
            className="bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="borrowed">Borrowed</option>
            <option value="maintenance">Maintenance</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Clean Inventory Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">Item ID</th>
                <th className="px-4 py-2.5">Equipment Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Current Holder</th>
                <th className="px-4 py-2.5">Owning Club</th>
                <th className="px-4 py-2.5">Condition</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-5 skeleton" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                    <p className="text-slate-600 dark:text-slate-400 font-medium text-xs">No equipment found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Add Item" above to add items to your catalog.</p>
                  </td>
                </tr>
              ) : (
                items.map((itm) => (
                  <tr key={itm.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {itm.qr_code_id || 'ITM-001'}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-900 dark:text-white text-xs">{itm.name}</p>
                      {itm.storage_location && <p className="text-[10px] text-slate-400 mt-0.5">{itm.storage_location}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{itm.category}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('badge-status', `badge-${itm.status}`)}>
                        <span className={cn('status-dot', itm.status)} />
                        {capitalize(itm.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{itm.current_holder || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{itm.owning_club}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{capitalize(itm.condition)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditItem(itm)}
                          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(itm.id, itm.name)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Slide-Over Side Panel (+ Add Item) ────────────────────── */}
      <AnimatePresence>
        {showAddSlideOver && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSlideOver(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 flex flex-col"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add Equipment Item</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Fill details to assign an auto Item ID</p>
                  </div>
                  <button
                    onClick={() => setShowAddSlideOver(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-y-auto p-5 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Equipment Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Sony A7III Camera"
                      required
                      className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Condition
                      </label>
                      <select
                        value={form.condition}
                        onChange={e => setForm({ ...form, condition: e.target.value as any })}
                        className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors"
                      >
                        {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Owning Club / Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.owningClub}
                      onChange={e => setForm({ ...form, owningClub: e.target.value })}
                      placeholder="e.g., Photography Club"
                      required
                      className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.quantity}
                        onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Storage Location
                      </label>
                      <input
                        type="text"
                        value={form.storageLocation}
                        onChange={e => setForm({ ...form, storageLocation: e.target.value })}
                        placeholder="e.g. Room 204, Cabinet A"
                        className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description & Specs
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      placeholder="Add details, serial numbers, or usage instructions..."
                      className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors resize-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => setShowAddSlideOver(false)}
                      className="px-3 py-1.5 rounded text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        'Save & Create Item'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" onClick={() => setEditItem(null)}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Edit Item Details</h2>
                <button onClick={() => setEditItem(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                  <input
                    value={editItem.name}
                    onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select
                      value={editItem.category}
                      onChange={e => setEditItem({ ...editItem, category: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select
                      value={editItem.status}
                      onChange={e => setEditItem({ ...editItem, status: e.target.value as any })}
                      className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                    >
                      {['available', 'borrowed', 'reserved', 'maintenance', 'lost'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setEditItem(null)} className="px-3 py-1 rounded text-xs font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                  <button type="submit" className="px-3.5 py-1 rounded bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
