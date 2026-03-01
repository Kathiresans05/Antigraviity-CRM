"use client";

import { useState } from "react";
import { Plus, Check, X, FileText } from "lucide-react";
import clsx from "clsx";
import axios from "axios";
import moment from "moment";

export default function ManpowerTab({ requests, isAdmin, onRefresh }: { requests: any[], isAdmin: boolean, onRefresh: () => void }) {
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ department: '', position: '', count: 1, reason: 'New Project', budgetApproved: false, requestedBy: '', notes: '' });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post('/api/manpower', form);
            setShowModal(false);
            onRefresh();
        } catch (err) { console.error(err); } finally { setSubmitting(false); }
    };

    const handleAction = async (id: string, action: 'Approved' | 'Rejected', convertToJob = false) => {
        try {
            await axios.patch('/api/manpower', { id, approvalStatus: action, convertToJob });
            onRefresh();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Manpower Requests</h3>
                    <p className="text-sm font-medium text-gray-500">Approve department hiring requests to convert them to Job Openings.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1F6F8B] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e293b]">
                    <Plus className="w-4 h-4" /> Raise Request
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Position</th>
                            <th className="px-6 py-4">Count</th>
                            <th className="px-6 py-4">Reason</th>
                            <th className="px-6 py-4">Budget</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {requests.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">No requests found</td></tr>
                        ) : requests.map((req) => (
                            <tr key={req._id} className="hover:bg-gray-50/50 group">
                                <td className="px-6 py-4 font-bold">{req.department}</td>
                                <td className="px-6 py-4 font-semibold text-gray-700">{req.position}</td>
                                <td className="px-6 py-4">{req.count}</td>
                                <td className="px-6 py-4 text-xs font-semibold">{req.reason}</td>
                                <td className="px-6 py-4">
                                    <span className={clsx("px-2 py-0.5 rounded text-xs font-bold", req.budgetApproved ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                        {req.budgetApproved ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                        req.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            req.approvalStatus === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                    )}>{req.approvalStatus}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-semibold">
                                    {req.approvalStatus === 'Pending' && isAdmin && (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleAction(req._id, 'Approved')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100" title="Approve"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => handleAction(req._id, 'Rejected')} className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Reject"><X className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                    {req.approvalStatus === 'Approved' && !req.convertedToJob && isAdmin && (
                                        <button onClick={() => handleAction(req._id, 'Approved', true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100">
                                            <FileText className="w-3.5 h-3.5" /> Convert to Job
                                        </button>
                                    )}
                                    {req.convertedToJob && <span className="text-xs text-gray-400 font-bold">Converted</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Manpower Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Raise Manpower Request</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input required placeholder="Department" className="w-full p-2.5 border rounded-xl text-sm" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                            <input required placeholder="Position Title" className="w-full p-2.5 border rounded-xl text-sm" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
                            <div className="flex gap-4">
                                <input required type="number" min={1} placeholder="Count" className="w-1/3 p-2.5 border rounded-xl text-sm" value={form.count} onChange={e => setForm({ ...form, count: parseInt(e.target.value) || 1 })} />
                                <select className="w-2/3 p-2.5 border rounded-xl text-sm" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                                    <option value="Replacement">Replacement</option><option value="New Project">New Project</option><option value="Expansion">Expansion</option>
                                </select>
                            </div>
                            <input required placeholder="Requested By (Your Name)" className="w-full p-2.5 border rounded-xl text-sm" value={form.requestedBy} onChange={e => setForm({ ...form, requestedBy: e.target.value })} />
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <input type="checkbox" id="budget" checked={form.budgetApproved} onChange={e => setForm({ ...form, budgetApproved: e.target.checked })} />
                                <label htmlFor="budget">Budget Approved</label>
                            </div>
                            <textarea placeholder="Additional Notes" className="w-full p-2.5 border rounded-xl text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-bold text-gray-500">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-[#1F6F8B] text-white rounded-xl text-sm font-bold hover:bg-[#1e293b]">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
