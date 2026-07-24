import { useState } from 'react';
import { Sparkles, Calendar, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Loader2, Package } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PlanItem {
  category: string;
  recommendedQuantity: number;
  reason: string;
  status: 'Available' | 'Shortage' | 'Substitute Suggested';
  availableCount: number;
  shortageCount: number;
  assignedItems: Array<{ id: string; name: string; qr_code_id: string }>;
  substitute: { category: string; availableCount: number; note: string } | null;
}

export default function EquipmentPlannerPage() {
  const [eventDescription, setEventDescription] = useState('');
  const [plan, setPlan] = useState<PlanItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDescription.trim()) {
      toast.error('Please describe your upcoming event');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post('/ai/plan-event', { eventDescription });
      setPlan(data.plan || []);
      toast.success('Equipment requirement plan generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserveAllAvailable = async () => {
    if (!plan) return;

    // Collect all assigned available item IDs
    const availableItemIds: string[] = [];
    plan.forEach(p => {
      p.assignedItems.forEach(item => {
        availableItemIds.push(item.id);
      });
    });

    if (availableItemIds.length === 0) {
      toast.error('No available items to reserve');
      return;
    }

    setIsReserving(true);
    try {
      const { data } = await api.post('/ai/reserve-plan', {
        itemIds: availableItemIds,
        notes: `Event Plan: ${eventDescription.slice(0, 50)}`,
      });
      toast.success(data.message || `Reserved ${data.count} equipment items!`);
      // Update local plan statuses
      setPlan(prev =>
        prev
          ? prev.map(item => ({
              ...item,
              status: item.assignedItems.length > 0 ? 'Available' : item.status,
            }))
          : null
      );
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reserve items');
    } finally {
      setIsReserving(false);
    }
  };

  const totalAssignedAvailable = plan
    ? plan.reduce((acc, p) => acc + p.assignedItems.length, 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white shrink-0 font-semibold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Intelligent Equipment Planner</h1>
            <p className="text-xs text-slate-500">Describe your campus event to generate a tailored equipment checklist & availability report</p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] space-y-3">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Describe Event Details
        </label>
        <textarea
          value={eventDescription}
          onChange={e => setEventDescription(e.target.value)}
          rows={3}
          placeholder="e.g., Annual Tech Hackathon, 300 participants, CS Department, Seminar Hall 1, tomorrow at 9 AM..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-teal-600 transition-colors resize-none"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-2">
            {['Hackathon (200 students)', 'Cultural Fest Concert', 'Sports Tournament'].map(sample => (
              <button
                key={sample}
                type="button"
                onClick={() => setEventDescription(sample)}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                + {sample}
              </button>
            ))}
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={isLoading || !eventDescription.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Plan...
              </>
            ) : (
              <>
                Generate Plan <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Plan Output Checklist */}
      {plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recommended Equipment Checklist</h2>
            {totalAssignedAvailable > 0 && (
              <button
                onClick={handleReserveAllAvailable}
                disabled={isReserving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isReserving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Reserve All Available ({totalAssignedAvailable} items)
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {plan.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {item.category}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      (Qty Needed: {item.recommendedQuantity})
                    </span>
                    <span
                      className={cn(
                        'badge-status',
                        item.status === 'Available' && 'badge-available',
                        item.status === 'Shortage' && 'badge-maintenance',
                        item.status === 'Substitute Suggested' && 'badge-reserved'
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{item.reason}</p>

                  {/* Assigned Item IDs */}
                  {item.assignedItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Assigned:</span>
                      {item.assignedItems.map(ai => (
                        <span
                          key={ai.id}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold"
                        >
                          {ai.qr_code_id || ai.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Substitute Suggestion */}
                  {item.substitute && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium pt-0.5">
                      💡 {item.substitute.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
