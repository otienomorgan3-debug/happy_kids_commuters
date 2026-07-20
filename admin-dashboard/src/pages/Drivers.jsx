import { useState, useEffect, useCallback } from 'react';
import { getAllDrivers, getAllBuses, assignDriver, unassignDriver, addDriver } from '../api/api';
import toast from 'react-hot-toast';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(null);
    const [selectedBus, setSelectedBus] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
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

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-600">Driver</th>
                                <th className="px-6 py-3 text-left text-gray-600">Phone</th>
                                <th className="px-6 py-3 text-left text-gray-600">License</th>
                                <th className="px-6 py-3 text-left text-gray-600">Assigned Bus</th>
                                <th className="px-6 py-3 text-left text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                        Loading drivers...
                                    </td>
                                </tr>
                            ) : drivers.map(driver => (
                                <tr key={driver.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{driver.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{driver.phone}</td>
                                    <td className="px-6 py-4">{driver.license_number}</td>
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
                                            </div>
                                        )}
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