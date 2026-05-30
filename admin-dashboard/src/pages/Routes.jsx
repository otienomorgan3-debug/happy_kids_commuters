import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { addRoute, deleteRoute, getAllRoutes, updateRoute } from '../api/api';

const createStop = (order = 1) => ({
    stop_name: '',
    location: '',
    latitude: '',
    longitude: '',
    stop_order: order,
});

const createRouteForm = () => ({
    route_name: '',
    estimated_time: '',
    stops: [createStop(1)],
});

const normalizeStops = (stops) =>
    stops
        .filter(stop => stop.stop_name.trim())
        .map((stop, index) => ({
            stop_name: stop.stop_name.trim(),
            location: stop.location.trim(),
            latitude: stop.latitude === '' ? null : Number(stop.latitude),
            longitude: stop.longitude === '' ? null : Number(stop.longitude),
            stop_order: Number(stop.stop_order) || index + 1,
        }))
        .sort((firstStop, secondStop) => firstStop.stop_order - secondStop.stop_order);

export default function Routes() {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(createRouteForm());

    const fetchRoutes = async () => {
        try {
            const res = await getAllRoutes();
            setRoutes(res.data.routes || []);
        } catch {
            toast.error('Failed to load routes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
    }, []);

    const resetForm = () => {
        setForm(createRouteForm());
        setEditingId(null);
    };

    const handleStopChange = (index, field, value) => {
        setForm(previous => ({
            ...previous,
            stops: previous.stops.map((stop, stopIndex) =>
                stopIndex === index ? { ...stop, [field]: value } : stop
            ),
        }));
    };

    const addStopRow = () => {
        setForm(previous => ({
            ...previous,
            stops: [...previous.stops, createStop(previous.stops.length + 1)],
        }));
    };

    const removeStopRow = (index) => {
        setForm(previous => {
            const nextStops = previous.stops.filter((_, stopIndex) => stopIndex !== index);
            return {
                ...previous,
                stops: nextStops.length > 0 ? nextStops : [createStop(1)],
            };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.route_name.trim()) {
            return toast.error('Route name is required');
        }

        const stops = normalizeStops(form.stops);
        if (stops.length === 0) {
            return toast.error('Add at least one stop');
        }
        if (stops.some(stop => !Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude))) {
            return toast.error('Every stop needs latitude and longitude for AI optimization');
        }

        const payload = {
            route_name: form.route_name.trim(),
            estimated_time: form.estimated_time ? Number(form.estimated_time) : null,
            stops,
        };

        setSaving(true);
        try {
            if (editingId) {
                await updateRoute(editingId, payload);
                toast.success('Route updated successfully');
            } else {
                await addRoute(payload);
                toast.success('Route created successfully');
            }
            resetForm();
            await fetchRoutes();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save route');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (route) => {
        setEditingId(route.id);
        setForm({
            route_name: route.route_name || '',
            estimated_time: route.estimated_time ?? '',
            stops: route.stops?.length > 0
                ? route.stops
                    .slice()
                    .sort((firstStop, secondStop) => firstStop.stop_order - secondStop.stop_order)
                    .map(stop => ({
                        stop_name: stop.stop_name || '',
                        location: stop.location || '',
                        stop_order: stop.stop_order || 1,
                    }))
                : [createStop(1)],
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (route) => {
        if (!window.confirm(`Delete route "${route.route_name}"?`)) return;

        try {
            await deleteRoute(route.id);
            toast.success('Route deleted');
            await fetchRoutes();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete route');
        }
    };

    const totalStops = useMemo(() => routes.reduce((count, route) => count + (route.stops?.length || 0), 0), [routes]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Routes</h2>
                    <p className="text-sm text-gray-500 mt-1">Create routes with ordered stops for each bus journey.</p>
                </div>
                <div className="text-sm text-gray-500">
                    {routes.length} routes • {totalStops} stops
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">
                            {editingId ? 'Edit Route' : 'Create Route'}
                        </h3>
                        <span className="text-xs text-gray-500">
                            Add coordinates so AI can optimize the stop order
                        </span>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Cancel edit
                            </button>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Route name</label>
                        <input
                            type="text"
                            value={form.route_name}
                            onChange={e => setForm(previous => ({ ...previous, route_name: e.target.value }))}
                            placeholder="e.g. Westlands Morning Route"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estimated time (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            value={form.estimated_time}
                            onChange={e => setForm(previous => ({ ...previous, estimated_time: e.target.value }))}
                            placeholder="45"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Stops</label>
                            <button
                                type="button"
                                onClick={addStopRow}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                + Add stop
                            </button>
                        </div>

                        {form.stops.map((stop, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700">Stop {index + 1}</span>
                                    {form.stops.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeStopRow(index)}
                                            className="text-xs text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        value={stop.stop_order}
                                        onChange={e => handleStopChange(index, 'stop_order', e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Order"
                                    />
                                    <input
                                        type="text"
                                        value={stop.stop_name}
                                        onChange={e => handleStopChange(index, 'stop_name', e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Stop name"
                                    />
                                    <input
                                        type="text"
                                        value={stop.location}
                                        onChange={e => handleStopChange(index, 'location', e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Location details"
                                    />
                                    <input
                                        type="number"
                                        step="any"
                                        value={stop.latitude}
                                        onChange={e => handleStopChange(index, 'latitude', e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Latitude"
                                    />
                                    <input
                                        type="number"
                                        step="any"
                                        value={stop.longitude}
                                        onChange={e => handleStopChange(index, 'longitude', e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Longitude"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : editingId ? 'Update Route' : 'Create Route'}
                    </button>
                </form>

                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-1">Route List</h3>
                        <p className="text-sm text-gray-500">Manage existing routes and their stops.</p>
                    </div>

                    {loading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                            Loading routes...
                        </div>
                    ) : routes.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                            No routes created yet
                        </div>
                    ) : (
                        routes.map(route => (
                            <div key={route.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-800">{route.route_name}</h4>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Estimated time: {route.estimated_time || '—'} minutes
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => handleEdit(route)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(route)}
                                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(route.stops || []).length > 0 ? route.stops
                                        .slice()
                                        .sort((firstStop, secondStop) => firstStop.stop_order - secondStop.stop_order)
                                        .map(stop => (
                                            <div key={stop.id || `${route.id}-${stop.stop_order}`} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                                <div className="text-xs font-semibold text-blue-700">
                                                    Stop {stop.stop_order}
                                                </div>
                                                <div className="text-sm font-medium text-gray-800">{stop.stop_name}</div>
                                                <div className="text-xs text-gray-500">{stop.location || 'No location details'}</div>
                                                <div className="text-xs text-gray-400">
                                                    {stop.latitude && stop.longitude
                                                        ? `${Number(stop.latitude).toFixed(4)}, ${Number(stop.longitude).toFixed(4)}`
                                                        : 'No coordinates'}
                                                </div>
                                            </div>
                                        )) : (
                                        <div className="text-sm text-gray-400">No stops added</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
