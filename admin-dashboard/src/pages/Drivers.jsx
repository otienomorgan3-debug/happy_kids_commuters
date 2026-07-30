import { useState, useEffect, useCallback } from 'react';
import {
    getAllDrivers, getAllBuses, assignDriver, unassignDriver, addDriver,
    getDriverAvailabilityHistory, updateDriverAvailability, reassignTrip
} from '../api/api';
import toast from 'react-hot-toast';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(null);
    const [selectedBus, setSelectedBus] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availabilityEditor, setAvailabilityEditor] = useState(null);
    const [reassignEditor, setReassignEditor] = useState(null);
    const [availabilityHistory, setAvailabilityHistory] = useState([]);
    const [selectedReplacementDriver, setSelectedReplacementDriver] = useState('');
    const [availabilityReason, setAvailabilityReason] = useState('');
    const [availabilityUntil, setAvailabilityUntil] = useState('');
    const [doNotReassign, setDoNotReassign] = useState(false);
    const [reassignReason, setReassignReason] = useState('');
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        license_number: '',
        password: ''
    });

    const fetchData = useCallback(async () => {
        try {
            const [driversRes, busesRes] = await Promise.all([
                getAllDrivers(),
                getAllBuses()
            ]);
            setDrivers(driversRes.data.drivers);
            setBuses(busesRes.data.buses);
            getDriverAvailabilityHistory({ limit: 10 })
                .then((res) => setAvailabilityHistory(res.data.history || []))
                .catch(() => {});
        } catch {
            toast.error('Failed to load drivers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleAssign = async (driver_id) => {
        if (!selectedBus) return toast.error('Please select a bus');
        try {
            await assignDriver({ driver_id, bus_id: parseInt(selectedBus) });
            toast.success('Driver assigned successfully');
            setAssigning(null);
            setSelectedBus('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Assignment failed');
        }
    };

    const handleUnassign = async (driver_id) => {
        try {
            await unassignDriver(driver_id);
            toast.success('Driver unassigned');
            fetchData();
        } catch {
            toast.error('Failed to unassign driver');
        }
    };

    const handleSaveAvailability = async () => {
        if (!availabilityEditor) return;
        try {
            await updateDriverAvailability(availabilityEditor.id, {
                availability_status: availabilityEditor.status,
                reason: availabilityReason || null,
                availability_until: availabilityUntil || null,
                do_not_reassign: doNotReassign || undefined,
            });
            toast.success('Driver availability updated');
            setAvailabilityEditor(null);
            setAvailabilityReason('');
            setAvailabilityUntil('');
            setDoNotReassign(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update availability');
        }
    };

    const handleSaveReassign = async () => {
        if (!reassignEditor || !selectedReplacementDriver) return toast.error('Select a replacement driver');
        try {
            await reassignTrip(reassignEditor.tripId, {
                replacement_driver_id: parseInt(selectedReplacementDriver),
                reason: reassignReason || 'Driver unavailable'
            });
            toast.success('Trip reassigned');
            setReassignEditor(null);
            setSelectedReplacementDriver('');
            setReassignReason('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reassign trip');
        }
    };

    const statusBadgeClass = (value) => {
        switch (value) {
            case 'available': return 'bg-green-100 text-green-700';
            case 'on_trip': return 'bg-blue-100 text-blue-700';
            case 'reassignment_pending': return 'bg-orange-100 text-orange-700';
            case 'unavailable':
            case 'on_leave':
            case 'sick':
            case 'offline':
                return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const availabilityStatusLabel = (value) => (value || 'available').replace(/_/g, ' ');

    const replacementOptions = reassignEditor
        ? drivers.filter(driver =>
            driver.id !== reassignEditor.currentDriverId &&
            driver.availability_status === 'available' &&
            driver.is_dispatchable &&
            (!reassignEditor.busId || !driver.bus_id || driver.bus_id === reassignEditor.busId)
        )
        : [];

    const handleAddDriver = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await addDriver(form);
            toast.success(`Driver added! Default password: ${res.data.driver.default_password}`);
            setShowAddForm(false);
            setForm({ name: '', email: '', phone: '', license_number: '', password: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add driver');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Drivers</h2>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{drivers.length} total</span>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                        {showAddForm ? 'Cancel' : '+ Add Driver'}
                    </button>
                </div>
            </div>

            {showAddForm && (
                <form onSubmit={handleAddDriver} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-semibold text-gray-800">Add New Driver</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="driver@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                            <input
                                type="tel"
                                required
                                value={form.phone}
                                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0712345678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">License Number *</label>
                            <input
                                type="text"
                                required
                                value={form.license_number}
                                onChange={e => setForm(prev => ({ ...prev, license_number: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="DL12345678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password (optional)</label>
                            <input
                                type="text"
                                value={form.password}
                                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Leave empty for default: driver123"
                            />
                            <p className="text-xs text-gray-500 mt-1">Default password will be 'driver123' if not provided</p>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                        {saving ? 'Adding Driver...' : 'Add Driver'}
                    </button>
                </form>
            )}

            {availabilityEditor && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Update Availability</h3>
                        <button
                            type="button"
                            onClick={() => {
                                setAvailabilityEditor(null);
                                setAvailabilityReason('');
                                setAvailabilityUntil('');
                                setDoNotReassign(false);
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">
                        {availabilityEditor.name} • {availabilityEditor.assigned_bus || 'Unassigned'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={availabilityEditor.status}
                                onChange={e => setAvailabilityEditor(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                            >
                                <option value="available">Available</option>
                                <option value="unavailable">Unavailable</option>
                                <option value="on_leave">On leave</option>
                                <option value="sick">Sick</option>
                                <option value="offline">Offline</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Available until</label>
                            <input
                                type="datetime-local"
                                value={availabilityUntil}
                                onChange={e => setAvailabilityUntil(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                            <input
                                type="text"
                                value={availabilityReason}
                                onChange={e => setAvailabilityReason(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                                placeholder="Optional reason"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="doNotReassign"
                                checked={doNotReassign}
                                onChange={e => setDoNotReassign(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="doNotReassign" className="text-sm font-medium text-gray-700">
                                Do not reassign this trip
                            </label>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveAvailability}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                        Save Availability
                    </button>
                </div>
            )}

            {reassignEditor && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Reassign Trip</h3>
                        <button
                            type="button"
                            onClick={() => {
                                setReassignEditor(null);
                                setSelectedReplacementDriver('');
                                setReassignReason('');
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">
                        Bus {reassignEditor.busPlate || reassignEditor.busId} • {reassignEditor.routeName || 'Active trip'} • Trip #{reassignEditor.tripId}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Replacement driver</label>
                            <select
                                value={selectedReplacementDriver}
                                onChange={e => setSelectedReplacementDriver(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                            >
                                <option value="">Select available driver</option>
                                {replacementOptions.map(driver => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name} {driver.assigned_bus ? `• ${driver.assigned_bus}` : '• Unassigned'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                            <input
                                type="text"
                                value={reassignReason}
                                onChange={e => setReassignReason(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                                placeholder="Why is the trip being reassigned?"
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveReassign}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                        Reassign Trip
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-600">Driver</th>
                                <th className="px-6 py-3 text-left text-gray-600">Phone</th>
                                <th className="px-6 py-3 text-left text-gray-600">License</th>
                                <th className="px-6 py-3 text-left text-gray-600">Availability</th>
                                <th className="px-6 py-3 text-left text-gray-600">Dispatch</th>
                                <th className="px-6 py-3 text-left text-gray-600">Active Trip</th>
                                <th className="px-6 py-3 text-left text-gray-600">Assigned Bus</th>
                                <th className="px-6 py-3 text-left text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                                        Loading drivers...
                                    </td>
                                </tr>
                            ) : drivers.map(driver => (
                                <tr key={driver.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{driver.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{driver.phone}</td>
                                    <td className="px-6 py-4">{driver.license_number}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(driver.availability_status)}`}>
                                            {availabilityStatusLabel(driver.availability_status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(driver.dispatch_status)}`}>
                                            {availabilityStatusLabel(driver.dispatch_status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-600">
                                        {driver.active_trip_id ? (
                                             <div className="space-y-1">
                                                 <div className="font-medium text-gray-800">Trip #{driver.active_trip_id}</div>
                                                 <div>{driver.active_route_name || 'Active route'}</div>
                                                 <div className="text-gray-500">{driver.active_trip_status}</div>
                                                 {driver.active_trip_do_not_reassign && (
                                                     <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                         Do Not Reassign
                                                     </span>
                                                 )}
                                                 {driver.active_trip_status === 'reassignment_pending' && !driver.active_trip_do_not_reassign && (
                                                     <button
                                                         type="button"
                                                         onClick={() => {
                                                             setReassignEditor({
                                                                 tripId: driver.active_trip_id,
                                                                 busId: driver.active_trip_bus_id || driver.bus_id,
                                                                 busPlate: driver.assigned_bus,
                                                                 routeName: driver.active_route_name,
                                                                 currentDriverId: driver.id,
                                                             });
                                                             setSelectedReplacementDriver('');
                                                             setReassignReason(`Replacement for ${driver.name}`);
                                                         }}
                                                         className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                     >
                                                         Reassign Trip
                                                     </button>
                                                 )}
                                             </div>
                                        ) : (
                                            <span className="text-gray-400">No active trip</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {driver.assigned_bus ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                                {driver.assigned_bus}
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs">
                                                Unassigned
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {assigning === driver.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedBus}
                                                    onChange={e => setSelectedBus(e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                                                >
                                                    <option value="">Select bus</option>
                                                    {buses.map(bus => (
                                                        <option key={bus.id} value={bus.id}>
                                                            {bus.plate_number}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleAssign(driver.id)}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setAssigning(null)}
                                                    className="text-gray-500 px-2 py-1 text-xs hover:text-gray-700"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                {!driver.assigned_bus && (
                                                <button
                                                    onClick={() => setAssigning(driver.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                >
                                                    Assign Bus
                                                </button>
                                                )}
                                                {driver.assigned_bus && (
                                                    <button
                                                        onClick={() => handleUnassign(driver.id)}
                                                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                                                    >
                                                        Unassign
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAvailabilityEditor({
                                                            id: driver.id,
                                                            name: driver.name,
                                                            assigned_bus: driver.assigned_bus,
                                                            status: driver.availability_status || 'available'
                                                        });
                                                        setAvailabilityReason(driver.availability_reason || '');
                                                        setAvailabilityUntil(driver.availability_until ? new Date(driver.availability_until).toISOString().slice(0, 16) : '');
                                                    }}
                                                    className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                                                >
                                                    Change Status
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Recent Availability Changes</h3>
                {availabilityHistory.length === 0 ? (
                    <p className="text-sm text-gray-400">No availability changes yet</p>
                ) : (
                    <div className="space-y-3">
                        {availabilityHistory.map(item => (
                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                                <div>
                                    <div className="text-sm font-medium text-gray-800">{item.driver_name}</div>
                                    <div className="text-xs text-gray-500">
                                        {item.old_status} → {item.new_status}
                                        {item.reason ? ` • ${item.reason}` : ''}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(item.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
