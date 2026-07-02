import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getDriverBehaviorScores, getDriverBehaviorLogs } from '../api/api';

export default function DriverBehavior() {
    const [scores, setScores] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedDriver, setSelectedDriver] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [scoresRes, logsRes] = await Promise.all([
                    getDriverBehaviorScores(),
                    getDriverBehaviorLogs()
                ]);
                if (!cancelled) {
                    setScores(scoresRes.data.scores || []);
                    setLogs(logsRes.data.logs || []);
                }
            } catch {
                if (!cancelled) toast.error('Failed to load driver behavior data');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        if (score >= 40) return 'text-orange-600';
        return 'text-red-600';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'bg-green-50 border-green-200';
        if (score >= 60) return 'bg-yellow-50 border-yellow-200';
        if (score >= 40) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    };

    const getBehaviorIcon = (type) => {
        switch (type) {
            case 'speeding': return '🚗';
            case 'harsh_braking': return '🛑';
            case 'rapid_acceleration': return '💨';
            case 'idle_time': return '⏸️';
            case 'route_deviation': return '🗺️';
            default: return '⚠️';
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'low': return 'bg-blue-100 text-blue-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'critical': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.behavior_type === filter);

    if (loading) return <div className="p-8 text-center text-gray-400">Loading driver behavior data...</div>;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Driver Behavior Monitoring</h1>
                <p className="text-gray-500 mt-1">{scores.length} drivers monitored • {logs.length} behavior logs</p>
            </div>

            {/* Driver Scores Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {scores.map(score => (
                    <div
                        key={score.driver_id}
                        onClick={() => setSelectedDriver(selectedDriver === score.driver_id ? null : score.driver_id)}
                        className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${getScoreBg(score.overall_score)}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-800">{score.driver_name}</h3>
                                <p className="text-xs text-gray-500">{score.plate_number || 'No bus assigned'}</p>
                            </div>
                            <div className={`text-3xl font-bold ${getScoreColor(score.overall_score)}`}>
                                {score.overall_score}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Speeding</span>
                                <span className="font-semibold text-gray-800">{score.speeding_count}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Harsh Braking</span>
                                <span className="font-semibold text-gray-800">{score.harsh_braking_count}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Rapid Accel</span>
                                <span className="font-semibold text-gray-800">{score.rapid_acceleration_count}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">⏸Idle Time</span>
                                <span className="font-semibold text-gray-800">{score.idle_time_minutes} min</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Route Deviations</span>
                                <span className="font-semibold text-gray-800">{score.route_deviations}</span>
                            </div>
                        </div>

                        <div className="text-xs text-gray-400 mt-3">
                            {score.total_trips} trips • Updated {new Date(score.last_updated).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Behavior Logs */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Behavior Logs</h2>
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Types</option>
                        <option value="speeding">Speeding</option>
                        <option value="harsh_braking">Harsh Braking</option>
                        <option value="rapid_acceleration">Rapid Acceleration</option>
                        <option value="idle_time">Idle Time</option>
                        <option value="route_deviation">Route Deviation</option>
                    </select>
                </div>

                {filteredLogs.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">No behavior logs recorded</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Behavior</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Speed</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredLogs.slice(0, 50).map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {log.driver_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {log.plate_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm">
                                                {getBehaviorIcon(log.behavior_type)} {log.behavior_type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {log.speed_kmh ? `${log.speed_kmh} km/h` : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}