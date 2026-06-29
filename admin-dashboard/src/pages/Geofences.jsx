import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAllGeofences, getGeofenceAlerts, acknowledgeGeofenceAlert, createGeofence } from '../api/api';

export default function Geofences() {
    const [geofences, setGeofences] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', type: 'school_zone', latitude: '', longitude: '', radius_meters: 100, alert_message: '' });

    const loadData = async () => {
        try {
            const [geoRes, alertsRes] = await Promise.all([
                getAllGeofences(),
                getGeofenceAlerts()
            ]);
            setGeofences(geoRes.data.geofences || []);
            setAlerts(alertsRes.data.alerts || []);
        } catch {
            toast.error('Failed to load geofences');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [geoRes, alertsRes] = await Promise.all([
                    getAllGeofences(),
                    getGeofenceAlerts()
                ]);
                if (!cancelled) {
                    setGeofences(geoRes.data.geofences || []);
                    setAlerts(alertsRes.data.alerts || []);
                }
            } catch {
                if (!cancelled) toast.error('Failed to load geofences');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createGeofence({
                ...form,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                radius_meters: parseInt(form.radius_meters)
            });
            toast.success('Geofence created');
            setShowForm(false);
            setForm({ name: '', type: 'school_zone', latitude: '', longitude: '', radius_meters: 100, alert_message: '' });
            loadData();
        } catch {
            toast.error('Failed to create geofence');
        }
    };

    const handleAcknowledge = async (alertId) => {
        try {
            await acknowledgeGeofenceAlert(alertId);
            toast.success('Alert acknowledged');
            loadData();
        } catch {
            toast.error('Failed to acknowledge alert');
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'school_zone': return 'bg-yellow-100 text-yellow-800';
            case 'route_stop': return 'bg-blue-100 text-blue-800';
            case 'restricted': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getAlertStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-red-100 text-red-800';
            case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading geofences...</div>;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Geofencing</h1>
                    <p className="text-gray-500 mt-1">{geofences.length} geofences • {alerts.filter(a => a.status === 'active').length} active alerts</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                    {showForm ? 'Cancel' : '+ Add Geofence'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-8 space-y-4">
                    <h3 className="font-semibold text-gray-800">Create New Geofence</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="e.g. School Zone A" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                                <option value="school_zone">School Zone</option>
                                <option value="route_stop">Route Stop</option>
                                <option value="restricted">Restricted Area</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                            <input type="number" step="any" required value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="-1.2675" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                            <input type="number" step="any" required value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="36.8108" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Radius (meters)</label>
                            <input type="number" value={form.radius_meters} onChange={e => setForm({ ...form, radius_meters: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Message</label>
                            <input type="text" value={form.alert_message} onChange={e => setForm({ ...form, alert_message: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Entering zone - reduce speed" />
                        </div>
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Create Geofence</button>
                </form>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Geofences List */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Geofences ({geofences.length})</h2>
                    {geofences.length === 0 ? (
                        <p className="text-gray-400 text-sm">No geofences created</p>
                    ) : (
                        <div className="space-y-3">
                            {geofences.map(gf => (
                                <div key={gf.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">{gf.name}</h4>
                                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getTypeColor(gf.type)}`}>
                                                {gf.type}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500">{gf.radius_meters}m radius</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">📍 {gf.latitude}, {gf.longitude}</p>
                                    {gf.alert_message && <p className="text-xs text-gray-600 mt-1 italic">"{gf.alert_message}"</p>}
                                    <div className="text-xs text-gray-400 mt-2">
                                        Active alerts: {gf.active_alerts_count || 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Alerts */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Alerts</h2>
                    {alerts.length === 0 ? (
                        <p className="text-gray-400 text-sm">No alerts yet</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {alerts.slice(0, 20).map(alert => (
                                <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800 text-sm">{alert.geofence_name}</h4>
                                            <p className="text-xs text-gray-500 mt-1">{alert.alert_message || 'Geofence alert'}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                🚌 {alert.plate_number} • 👤 {alert.driver_name || 'Unknown'}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAlertStatusColor(alert.status)}`}>
                                            {alert.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-xs text-gray-400">
                                            {new Date(alert.created_at).toLocaleString()}
                                        </span>
                                        {alert.status === 'active' && (
                                            <button
                                                onClick={() => handleAcknowledge(alert.id)}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Acknowledge
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}