import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAnalytics, getDashboardStats } from '../api/api';

export default function Analytics() {
    const [data, setData] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
            try {
                const [analyticsRes, statsRes] = await Promise.all([
                    getAnalytics(),
                    getDashboardStats()
                ]);
                if (!cancelled) {
                    setData(analyticsRes.data);
                    setStats(statsRes.data.stats);
                }
            } catch {
                if (!cancelled) toast.error('Failed to load analytics');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadData();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Loading analytics...</div>;
    }

    const weeklyTrips = data?.weekly_trips || [];
    const attendanceRates = data?.attendance_rates || [];
    const monthlyPayments = data?.monthly_payments || [];
    const busUtilization = data?.bus_utilization || [];

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics & Charts</h1>

            {/* Overview Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                        <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_students}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                        <h3 className="text-gray-500 text-sm font-medium">Active Trips</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active_trips}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
                        <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                        <p className="text-3xl font-bold text-green-600 mt-2">KES {Number(stats.total_revenue).toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
                        <h3 className="text-gray-500 text-sm font-medium">Outstanding</h3>
                        <p className="text-3xl font-bold text-red-600 mt-2">KES {Number(stats.total_outstanding).toFixed(2)}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                {/* Weekly Trips Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Weekly Trip Activity</h2>
                    {weeklyTrips.length === 0 ? (
                        <p className="text-gray-400 text-sm">No trip data this week</p>
                    ) : (
                        <div className="space-y-3">
                            {weeklyTrips.map((day, i) => {
                                const maxCount = Math.max(...weeklyTrips.map(d => Number(d.trip_count)), 1);
                                const pct = (Number(day.trip_count) / maxCount) * 100;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-20">
                                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600 w-8 text-right">{day.trip_count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bus Utilization */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Bus Utilization (30 days)</h2>
                    {busUtilization.length === 0 ? (
                        <p className="text-gray-400 text-sm">No bus trip data available</p>
                    ) : (
                        <div className="space-y-3">
                            {busUtilization.map((bus, i) => {
                                const maxCount = Math.max(...busUtilization.map(b => Number(b.trip_count)), 1);
                                const pct = (Number(bus.trip_count) / maxCount) * 100;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-24">{bus.plate_number}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                            <div
                                                className="bg-green-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600 w-8 text-right">{bus.trip_count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Attendance Rates */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Student Attendance Rates</h2>
                    {attendanceRates.length === 0 ? (
                        <p className="text-gray-400 text-sm">No attendance data available</p>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {attendanceRates.map((student, i) => {
                                const total = Number(student.total_days) || 1;
                                const present = Number(student.days_present) || 0;
                                const pct = Math.round((present / total) * 100);
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-600 w-28 truncate">{student.name}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600 w-16 text-right">
                                            {present}/{total} ({pct}%)
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Monthly Payments */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Payment Trends</h2>
                    {monthlyPayments.length === 0 ? (
                        <p className="text-gray-400 text-sm">No payment data available</p>
                    ) : (
                        <div className="space-y-3">
                            {monthlyPayments.map((month, i) => {
                                const maxAmount = Math.max(...monthlyPayments.map(m => Number(m.total_amount)), 1);
                                const pct = (Number(month.total_amount) / maxAmount) * 100;
                                const monthLabel = new Date(month.month + '-01T00:00:00')
                                    .toLocaleDateString('en', { month: 'short', year: '2-digit' });
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-16">{monthLabel}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                            <div
                                                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600 w-24 text-right">
                                            KES {Number(month.total_amount).toLocaleString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}