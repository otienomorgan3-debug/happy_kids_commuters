import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getAllBuses, addBus, updateBus, deleteBus } from '../api/api';

export default function Buses() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ plate_number: '', capacity: '', gps_device_id: '' });

    const fetchBuses = async () => {
        try {
            const res = await getAllBuses();
            setBuses(res.data.buses || []);
        } catch {
            toast.error('Failed to load buses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBuses(); }, []);

    const resetForm = () => {
        setForm({ plate_number: '', capacity: '', gps_device_id: '' });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.plate_number.trim() || !form.capacity) {
            return toast.error('Plate number and capacity are required');
        }
        setSaving(true);
        try {
            if (editingId) {
                await updateBus(editingId, { ...form, capacity: Number(form.capacity) });
                toast.success('Bus updated');
            } else {
                await addBus({ ...form, capacity: Number(form.capacity) });
                toast.success('Bus added');
            }
            resetForm();
            await fetchBuses();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save bus');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (bus) => {
        setEditingId(bus.id);
        setForm({
            plate_number: bus.plate_number || '',
            capacity: String(bus.capacity || ''),
            gps_device_id: bus.gps_device_id || ''
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this bus?')) return;
        try {
            await deleteBus(id);
            toast.success('Bus deleted');
            await fetchBuses();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete bus');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Buses</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage fleet vehicles and assignments.</p>
                </div>
                <span className="text-sm text-gray-500">{buses.length} total</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-semibold text-gray-800">{editingId ? 'Edit Bus' : 'Add Bus'}</h3>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700">Cancel edit</button>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plate Number *</label>
                        <input type="text" value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="KCA 123A" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Capacity *</label>
                        <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="40" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">GPS Device ID</label>
                        <input type="text" value={form.gps_device_id} onChange={e => setForm({ ...form, gps_device_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="GPS_DEVICE_001" />
                    </div>
                    <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving...' : editingId ? 'Update Bus' : 'Add Bus'}
                    </button>
                </form>

                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-1">Fleet List</h3>
                        <p className="text-sm text-gray-500">All registered buses and their drivers.</p>
                    </div>
                    {loading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading buses...</div>
                    ) : buses.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No buses added yet</div>
                    ) : (
                        <div className="space-y-3">
                            {buses.map(bus => (
                                <div key={bus.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Bus {bus.plate_number}</h4>
                                        <p className="text-sm text-gray-500 mt-1">Capacity: {bus.capacity} • GPS: {bus.gps_device_id || '—'}</p>
                                        {bus.driver_name && <p className="text-sm text-gray-500">Driver: {bus.driver_name} ({bus.driver_phone})</p>}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleEdit(bus)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                                        <button onClick={() => handleDelete(bus.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
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
