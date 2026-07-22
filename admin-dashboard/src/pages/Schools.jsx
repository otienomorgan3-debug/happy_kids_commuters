import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getAllSchools, addSchool, updateSchool, deleteSchool } from '../api/api';

export default function Schools() {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ school_name: '', address: '' });

    const fetchSchools = async () => {
        try {
            const res = await getAllSchools();
            setSchools(res.data.schools || []);
        } catch {
            toast.error('Failed to load schools');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSchools(); }, []);

    const resetForm = () => {
        setForm({ school_name: '', address: '' });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.school_name.trim()) {
            return toast.error('School name is required');
        }
        setSaving(true);
        try {
            if (editingId) {
                await updateSchool(editingId, form);
                toast.success('School updated');
            } else {
                await addSchool(form);
                toast.success('School added');
            }
            resetForm();
            await fetchSchools();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save school');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (school) => {
        setEditingId(school.id);
        setForm({ school_name: school.school_name || '', address: school.address || '' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this school?')) return;
        try {
            await deleteSchool(id);
            toast.success('School deleted');
            await fetchSchools();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete school');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Schools</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage registered schools.</p>
                </div>
                <span className="text-sm text-gray-500">{schools.length} total</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-semibold text-gray-800">{editingId ? 'Edit School' : 'Add School'}</h3>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700">Cancel edit</button>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">School Name *</label>
                        <input type="text" value={form.school_name} onChange={e => setForm({ ...form, school_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sunshine School" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Karen" />
                    </div>
                    <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving...' : editingId ? 'Update School' : 'Add School'}
                    </button>
                </form>

                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-1">School List</h3>
                        <p className="text-sm text-gray-500">All registered schools.</p>
                    </div>
                    {loading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading schools...</div>
                    ) : schools.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No schools added yet</div>
                    ) : (
                        <div className="space-y-3">
                            {schools.map(school => (
                                <div key={school.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-800">{school.school_name}</h4>
                                        <p className="text-sm text-gray-500 mt-1">{school.address || 'No address'}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleEdit(school)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                                        <button onClick={() => handleDelete(school.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
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
