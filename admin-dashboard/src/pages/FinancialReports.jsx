import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getFinancialReport, getPaymentStats } from '../api/api';

export default function FinancialReports() {
    const [report, setReport] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('monthly');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleApplyFilter = () => {
        setLoading(true);
        (async () => {
            try {
                const [reportRes, statsRes] = await Promise.all([
                    getFinancialReport({ period, start_date: startDate || undefined, end_date: endDate || undefined }),
                    getPaymentStats()
                ]);
                setReport(reportRes.data);
                setStats(statsRes.data);
            } catch {
                toast.error('Failed to load financial report');
            } finally {
                setLoading(false);
            }
        })();
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [reportRes, statsRes] = await Promise.all([
                    getFinancialReport({ period, start_date: startDate || undefined, end_date: endDate || undefined }),
                    getPaymentStats()
                ]);
                if (!cancelled) {
                    setReport(reportRes.data);
                    setStats(statsRes.data);
                }
            } catch {
                if (!cancelled) toast.error('Failed to load financial report');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [period, startDate, endDate]);

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Loading financial report...</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Financial Reports</h1>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="weekly">Last 7 Days</option>
                            <option value="monthly">Last 30 Days</option>
                            <option value="yearly">Last Year</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleApplyFilter}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                        Apply Filter
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                            KES {Number(stats.totalRevenue || stats.paidAmount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{stats.paidCount || 0} transactions</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">Pending</h3>
                        <p className="text-2xl font-bold text-yellow-600 mt-2">
                            KES {Number(stats.pendingAmount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{stats.pendingCount || 0} transactions</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">Failed</h3>
                        <p className="text-2xl font-bold text-red-600 mt-2">
                            KES {Number(stats.failedAmount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{stats.failedCount || 0} transactions</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">Outstanding Debt</h3>
                        <p className="text-2xl font-bold text-red-600 mt-2">
                            KES {Number(report?.outstanding?.total_outstanding || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {report?.outstanding?.parents_with_debt || 0} parents with debt
                        </p>
                    </div>
                </div>
            )}

            {/* Daily Breakdown */}
            {report?.daily_breakdown && report.daily_breakdown.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Revenue Breakdown</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {report.daily_breakdown.map((day, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                                            KES {Number(day.paid_amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-medium text-yellow-600">
                                            KES {Number(day.pending_amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary from report */}
            {report?.summary && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Transaction Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Paid Transactions</div>
                            <div className="text-xl font-bold text-green-600 mt-1">{report.summary.paid_transactions}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Pending Transactions</div>
                            <div className="text-xl font-bold text-yellow-600 mt-1">{report.summary.pending_transactions}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Failed Transactions</div>
                            <div className="text-xl font-bold text-red-600 mt-1">{report.summary.failed_transactions}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-sm text-green-700">Collected Revenue</div>
                            <div className="text-xl font-bold text-green-800 mt-1">
                                KES {Number(report.summary.collected_revenue).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="text-sm text-yellow-700">Pending Revenue</div>
                            <div className="text-xl font-bold text-yellow-800 mt-1">
                                KES {Number(report.summary.pending_revenue).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}