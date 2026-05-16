import { useState, useEffect } from 'react';
import { getAllDrivers, getAllBuses, assignDriver, unassignDriver } from '../api/api';
import toast from 'react-hot-toast';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(null);
    const [selectedBus, setSelectedBus] = useState('');

    const fetchData = async () => {
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
    };

    useEffect(() => { fetchData(); }, []);

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

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Drivers</h2>
                <span className="text-sm text-gray-500">{drivers.length} total</span>
            </div>

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
                                                <button
                                                    onClick={() => setAssigning(driver.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                >
                                                    Assign Bus
                                                </button>
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