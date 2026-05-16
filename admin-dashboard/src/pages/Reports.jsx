import { useState } from 'react';
import { getAttendanceReport, getTripReport } from '../api/api';
import toast from 'react-hot-toast';

export default function Reports() {
    const [activeTab, setActiveTab] = useState('attendance');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState(null);
    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await getAttendanceReport(date);
            setAttendanceData(res.data);
        } catch {
            toast.error('Failed to load attendance report');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const res = await getTripReport();
            setTripData(res.data);
        } catch {
            toast.error('Failed to load trip report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Reports</h2>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {['attendance', 'trips'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Attendance Report */}
            {activeTab === 'attendance' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                            onClick={fetchAttendance}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Generate Report'}
                        </button>
                    </div>

                    {attendanceData && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between">
                                <h3 className="font-semibold">Attendance — {attendanceData.date}</h3>
                                <span className="text-sm text-gray-500">{attendanceData.total} students</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-gray-600">Student</th>
                                            <th className="px-6 py-3 text-left text-gray-600">Parent</th>
                                            <th className="px-6 py-3 text-left text-gray-600">Bus</th>
                                            <th className="px-6 py-3 text-left text-gray-600">Boarded</th>
                                            <th className="px-6 py-3 text-left text-gray-600">Dropped</th>
                                            <th className="px-6 py-3 text-left text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attendanceData.report.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium">{row.student_name}</td>
                                                <td className="px-6 py-4">{row.parent_name}</td>
                                                <td className="px-6 py-4">{row.bus || '—'}</td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {row.boarded_at ? new Date(row.boarded_at).toLocaleTimeString() : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {row.dropped_at ? new Date(row.dropped_at).toLocaleTimeString() : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'dropped off' ? 'bg-green-100 text-green-700' :
                                                            row.status === 'on bus' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {row.status || 'absent'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Trip Report */}
            {activeTab === 'trips' && (
                <div className="space-y-4">
                    <button
                        onClick={fetchTrips}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Load Trip Report'}
                    </button>

                    {tripData && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="font-semibold">Trip Report — {tripData.total} trips</h3>
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
                                        {tripData.trips.map(trip => (
                                            <tr key={trip.trip_id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium">{trip.plate_number}</td>
                                                <td className="px-6 py-4">{trip.driver_name}</td>
                                                <td className="px-6 py-4">{trip.route_name || '—'}</td>
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
                    )}
                </div>
            )}
        </div>
    );
}