import { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, Sparkles, RefreshCw, Loader2, ArrowUpRight, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async (selectedPeriod = period) => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/ai/report', { params: { period: selectedPeriod } });
      setReportData(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(period);
  }, [period]);

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = `data:text/csv;charset=utf-8,`;
    csvContent += `Period,${reportData.period.toUpperCase()}\n\n`;
    csvContent += `Executive Summary:\n"${reportData.executiveSummary.replace(/"/g, '""')}"\n\n`;

    csvContent += `Stat,Value\n`;
    csvContent += `Total Borrows,${reportData.stats.totalBorrows}\n`;
    csvContent += `Total Returns,${reportData.stats.totalReturns}\n`;
    csvContent += `Active Overdue,${reportData.stats.activeOverdue}\n\n`;

    csvContent += `Most Borrowed Items\nItem Code,Name,Category,Borrow Count\n`;
    reportData.stats.topBorrowed.forEach((b: any) => {
      csvContent += `${b.qr_code_id || '—'},"${b.name}",${b.category},${b.borrow_count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory-report-${reportData.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV report exported!');
  };

  // Export PDF using jsPDF
  const handleExportPDF = () => {
    if (!reportData) return;

    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Smart Inventory AI - ${reportData.period.toUpperCase()} Report`, 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary:', 14, 38);
      doc.setFont('helvetica', 'normal');

      const splitSummary = doc.splitTextToSize(reportData.executiveSummary, 180);
      doc.text(splitSummary, 14, 44);

      let yPos = 44 + splitSummary.length * 6 + 10;

      doc.setFont('helvetica', 'bold');
      doc.text('Period Key Metrics:', 14, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.text(`Total Borrows: ${reportData.stats.totalBorrows}`, 14, yPos);
      doc.text(`Total Returns: ${reportData.stats.totalReturns}`, 70, yPos);
      doc.text(`Active Overdue: ${reportData.stats.activeOverdue}`, 130, yPos);
      yPos += 14;

      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 Most Borrowed Items:', 14, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      reportData.stats.topBorrowed.forEach((item: any, idx: number) => {
        doc.text(`${idx + 1}. ${item.name} (${item.qr_code_id || 'ITM'}) - ${item.borrow_count} borrows`, 18, yPos);
        yPos += 6;
      });

      doc.save(`inventory-report-${reportData.period}.pdf`);
      toast.success('PDF report downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white shrink-0 font-semibold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">AI Executive Reports</h1>
            <p className="text-xs text-slate-500">Automated AI analytics, trend summaries, and printable reports</p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!reportData || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!reportData || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                period === p
                  ? 'bg-teal-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchReport(period)}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-28 skeleton" />
          <div className="grid grid-cols-2 gap-4"><div className="h-40 skeleton" /><div className="h-40 skeleton" /></div>
        </div>
      ) : reportData ? (
        <div className="space-y-5">
          {/* AI Executive Summary Callout Box */}
          <div className="p-4 rounded-xl border border-teal-600/30 bg-teal-50/20 dark:bg-teal-950/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <Sparkles className="w-4 h-4" /> AI Executive Summary ({period.toUpperCase()})
            </div>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
              {reportData.executiveSummary}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
              <span className="text-[11px] text-slate-400 font-medium block">Period Borrows</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {reportData.stats.totalBorrows}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
              <span className="text-[11px] text-slate-400 font-medium block">Period Returns</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {reportData.stats.totalReturns}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
              <span className="text-[11px] text-slate-400 font-medium block">Active Overdue</span>
              <span className="text-2xl font-bold text-amber-600 mt-1 block">
                {reportData.stats.activeOverdue}
              </span>
            </div>
          </div>

          {/* Most & Least Borrowed Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Most Borrowed */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
                <span>Top 5 Most Borrowed Items</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-teal-600" />
              </h3>
              <div className="space-y-2">
                {reportData.stats.topBorrowed.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No borrows recorded in this period</p>
                ) : (
                  reportData.stats.topBorrowed.map((b: any) => (
                    <div key={b.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-none">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{b.name}</span>
                        <span className="text-[10px] text-slate-400 block">{b.category} • {b.qr_code_id || 'ITM'}</span>
                      </div>
                      <span className="font-bold text-teal-600">{b.borrow_count} borrows</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Least Borrowed */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">
                Bottom 5 Least Used Items
              </h3>
              <div className="space-y-2">
                {reportData.stats.leastBorrowed.map((l: any) => (
                  <div key={l.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-none">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">{l.name}</span>
                      <span className="text-[10px] text-slate-400 block">{l.category} • {l.qr_code_id || 'ITM'}</span>
                    </div>
                    <span className="font-medium text-slate-500">{l.borrow_count} borrows</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
