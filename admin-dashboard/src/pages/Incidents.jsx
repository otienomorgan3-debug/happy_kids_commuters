import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getIncidents, getIncidentStats, updateIncidentStatus } from '../api/api';

export default function Incidents() {
    const [incidents, setIncidents] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
            try {
                const [incidentsRes, statsRes] = await Promise.all([
                    getIncidents(),
                    getIncidentStats()
                ]);
                if (!cancelled) {
                    setIncidents(incidentsRes.data.incidents || []);
                    setStats(statsRes.data.stats);
                }
            } catch {
                if (!cancelled) toast.error('Failed to load incidents');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadData();
        return () => { cancelled = true; };
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateIncidentStatus(id, { status: newStatus });
            toast.success(`Incident marked as ${newStatus}`);
            (async () => {
                try {
                    const [incidentsRes, statsRes] = await Promise.all([
                        getIncidents(),
                        getIncidentStats()
                    ]);
                    setIncidents(incidentsRes.data.incidents || []);
                    setStats(statsRes.data.stats);
                } catch {
                    toast.error('Failed to reload incidents');
                }
            })();
        } catch {
            toast.error('Failed to update incident status');
        }
    };

    const filteredIncidents = filter === 'all'
        ? incidents
        : incidents.filter(i => i.status === filter);

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'active': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Loading incidents...</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Incident Management</h1>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-gray-500 text-xs font-medium">Total</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-gray-500 text-xs font-medium">Active</h3>
                        <p className="text-2xl font-bold text-red-600 mt-1">{stats.active}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-gray-500 text-xs font-medium">Pending</h3>
                        <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-gray-500 text-xs font-medium">Resolved</h3>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.resolved}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-gray-500 text-xs font-medium">This Week</h3>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.this_week}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="flex gap-2">
                    {['all', 'active', 'pending', 'resolved'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Incidents Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredIncidents.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No incidents found</td>
                            </tr>
                        ) : (
                            filteredIncidents.map(inc => (
                                <tr key={inc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">#{inc.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{inc.plate_number || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{inc.driver_name || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{inc.location || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(inc.status)}`}>
                                            {inc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(inc.created_at)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            {inc.status !== 'resolved' && (
                                                <button
                                                    onClick={() => handleStatusChange(inc.id, 'resolved')}
                                                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                            {inc.status !== 'active' && (
                                                <button
                                                    onClick={() => handleStatusChange(inc.id, 'active')}
                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    Activate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}