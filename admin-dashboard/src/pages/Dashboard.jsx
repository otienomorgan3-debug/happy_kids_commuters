import { useState, useEffect } from 'react';
import { getDashboardStats, getTripReport } from '../api/api';
import StatCard from '../components/StatCard';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, tripsRes] = await Promise.all([
                    getDashboardStats(),
                    getTripReport()
                ]);
                setStats(statsRes.data.stats);
                setTrips(tripsRes.data.trips.slice(0, 5));
            } catch {
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading dashboard...</div>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Students" value={stats.total_students} color="blue" />
                    <StatCard title="Total Drivers" value={stats.total_drivers} color="green" />
                    <StatCard title="Total Buses" value={stats.total_buses} color="yellow" />
                    <StatCard title="Active Trips" value={stats.active_trips} color="purple" />
                </div>
            )}

            {/* Recent Trips */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Recent Trips</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-600">Bus</th>
                                <th className="px-6 py-3 text-left text-gray-600">Driver</th>
                                <th className="px-6 py-3 text-left text-gray-600">Route</th>
                                <th className="px-6 py-3 text-left text-gray-600">Students</th>
                                <th className="px-6 py-3 text-left text-gray-600">Status</th>
                                <th className="px-6 py-3 text-left text-gray-600">Start Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {trips.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                        No trips recorded yet
                                    </td>
                                </tr>
                            ) : trips.map(trip => (
                                <tr key={trip.trip_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{trip.plate_number}</td>
                                    <td className="px-6 py-4">{trip.driver_name}</td>
                                    <td className="px-6 py-4">{trip.route_name || 'No route'}</td>
                                    <td className="px-6 py-4">{trip.students_transported}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${trip.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {trip.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(trip.start_time).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}