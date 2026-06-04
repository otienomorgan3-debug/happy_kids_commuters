import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons for Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const busIcon = L.divIcon({
    html: '🚌',
    className: 'text-2xl',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const NAIROBI_CENTER = [-1.2921, 36.8219];

export default function LiveMap() {
    const [busLocations, setBusLocations] = useState({});
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = io('http://localhost:5000');

        socket.on('connect', () => {
            setConnected(true);
            console.log('Connected to live tracking');
        });

        socket.on('disconnect', () => setConnected(false));

        // Listen for bus location updates
        socket.on('bus:location', (data) => {
            setBusLocations(prev => ({
                ...prev,
                [data.bus_id]: data
            }));
        });

        // Listen for emergency alerts
        socket.on('emergency:alert', (data) => {
            alert(`🚨 EMERGENCY ALERT!\nBus ${data.bus_id} needs help!\nLocation: ${data.latitude}, ${data.longitude}`);
        });

        return () => socket.disconnect();
    }, []);

    const buses = Object.values(busLocations);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Live Bus Tracking</h2>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600">
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Active buses count */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                🚌 {buses.length} bus{buses.length !== 1 ? 'es' : ''} currently active
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '500px' }}>
                <MapContainer
                    center={NAIROBI_CENTER}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="© OpenStreetMap contributors"
                    />

                    {buses.map(bus => (
                        <Marker
                            key={bus.bus_id}
                            position={[bus.latitude, bus.longitude]}
                            icon={busIcon}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-bold">Bus {bus.bus_id}</p>
                                    <p className="text-gray-600">Lat: {bus.latitude}</p>
                                    <p className="text-gray-600">Lng: {bus.longitude}</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        Updated: {new Date(bus.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Bus list */}
            {buses.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-800">Active Buses</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {buses.map(bus => (
                            <div key={bus.bus_id} className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🚌</span>
                                    <div>
                                        <p className="font-medium">Bus {bus.bus_id}</p>
                                        <p className="text-sm text-gray-500">
                                            {bus.latitude}, {bus.longitude}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(bus.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}