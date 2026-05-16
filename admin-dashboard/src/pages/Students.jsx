import { useState, useEffect } from 'react';
import { getAllStudents } from '../api/api';
import toast from 'react-hot-toast';

export default function Students() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getAllStudents()
            .then(res => setStudents(res.data.students))
            .catch(() => toast.error('Failed to load students'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.parent_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Students</h2>
                <span className="text-sm text-gray-500">{students.length} total</span>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search by name or parent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-600">Student</th>
                                <th className="px-6 py-3 text-left text-gray-600">Parent</th>
                                <th className="px-6 py-3 text-left text-gray-600">Phone</th>
                                <th className="px-6 py-3 text-left text-gray-600">School</th>
                                <th className="px-6 py-3 text-left text-gray-600">Pickup</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                        Loading students...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                        No students found
                                    </td>
                                </tr>
                            ) : filtered.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{student.name}</td>
                                    <td className="px-6 py-4">{student.parent_name}</td>
                                    <td className="px-6 py-4 text-gray-500">{student.parent_phone}</td>
                                    <td className="px-6 py-4">{student.school_name}</td>
                                    <td className="px-6 py-4 text-gray-500">{student.pickup_location}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}