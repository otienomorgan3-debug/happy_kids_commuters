import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAllParents, getParentDetails } from '../api/api';

export default function Parents() {
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedParent, setSelectedParent] = useState(null);
    const [parentDetail, setParentDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadParents = async () => {
            try {
                const res = await getAllParents();
                if (!cancelled) setParents(res.data.parents || []);
            } catch {
                if (!cancelled) toast.error('Failed to load parents');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadParents();
        return () => { cancelled = true; };
    }, []);

    const handleViewDetails = async (parent) => {
        setSelectedParent(parent);
        setDetailLoading(true);
        try {
            const res = await getParentDetails(parent.id);
            setParentDetail(res.data);
        } catch {
            toast.error('Failed to load parent details');
        } finally {
            setDetailLoading(false);
        }
    };

    const filteredParents = parents.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
    );

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Parent Management</h1>
                    <p className="text-gray-500 mt-1">{parents.length} registered parents</p>
                </div>
                <input
                    type="text"
                    placeholder="Search parents..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Parent List */}
                <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading parents...</div>
                    ) : filteredParents.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No parents found</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Children</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredParents.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(p)}>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500">Since {formatDate(p.created_at)}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-gray-900">{p.email}</div>
                                            <div className="text-xs text-gray-500">{p.phone}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-sm font-semibold text-gray-900">{p.children_count}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={`text-sm font-semibold ${p.total_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                KES {Number(p.total_outstanding).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Parent Detail Panel */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {!selectedParent ? (
                        <div className="text-center text-gray-400 py-12">
                            <p className="text-4xl mb-4">👤</p>
                            <p>Select a parent to view details</p>
                        </div>
                    ) : detailLoading ? (
                        <div className="text-center text-gray-400 py-12">Loading...</div>
                    ) : parentDetail ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-gray-800 text-lg">{parentDetail.parent.name}</h3>
                                <p className="text-sm text-gray-500">{parentDetail.parent.email}</p>
                                <p className="text-sm text-gray-500">{parentDetail.parent.phone}</p>
                                {parentDetail.parent.address && (
                                    <p className="text-sm text-gray-500 mt-1">📍 {parentDetail.parent.address}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">Registered: {formatDate(parentDetail.parent.created_at)}</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-700 text-sm mb-3">Children ({parentDetail.students?.length || 0})</h4>
                                {parentDetail.students?.length === 0 ? (
                                    <p className="text-sm text-gray-400">No children registered</p>
                                ) : (
                                    <div className="space-y-2">
                                        {parentDetail.students.map(s => (
                                            <div key={s.id} className="bg-gray-50 rounded-lg p-3">
                                                <div className="text-sm font-medium text-gray-800">{s.name}</div>
                                                <div className="text-xs text-gray-500">{s.school_name}</div>
                                                <div className="text-xs text-gray-400 mt-1">📍 {s.pickup_location}</div>
                                                {s.outstanding_balance > 0 && (
                                                    <div className="text-xs text-red-500 mt-1">
                                                        Outstanding: KES {Number(s.outstanding_balance).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-700 text-sm mb-3">Recent Payments</h4>
                                {parentDetail.payments?.length === 0 ? (
                                    <p className="text-sm text-gray-400">No payments yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {parentDetail.payments?.slice(0, 5).map(pay => (
                                            <div key={pay.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-800">
                                                        KES {Number(pay.amount).toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{formatDate(pay.created_at)}</div>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    pay.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    pay.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {pay.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}