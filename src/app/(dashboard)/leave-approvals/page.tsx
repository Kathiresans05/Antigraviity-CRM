"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Calendar, CheckCircle, XCircle, Clock,
    Search, Filter, User, CalendarDays,
    MessageSquare, Check, X, AlertCircle, Loader2, ChevronDown, Download, ArrowRight
} from "lucide-react";
import axios from "axios";
import moment from "moment";
import clsx from "clsx";

interface LeaveRecord {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    appliedOn: string;
}

export default function LeaveApprovalsPage() {
    const { data: session } = useSession();
    const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchLeaves = async () => {
        try {
            const res = await axios.get("/api/leave");
            setLeaves(res.data.records);
        } catch (err) {
            console.error("Failed to fetch leaves:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleAction = async (leaveId: string, status: 'Approved' | 'Rejected') => {
        setActioningId(leaveId);
        try {
            await axios.patch("/api/leave", { leaveId, status });
            setLeaves(prev => prev.map(l => l._id === leaveId ? { ...l, status } : l));
        } catch (err) {
            console.error(`Failed to ${status} leave:`, err);
            alert(`Failed to ${status} leave. Please try again.`);
        } finally {
            setActioningId(null);
        }
    };

    const filtered = leaves.filter(l =>
        l.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: leaves.length,
        pending: leaves.filter(l => l.status === 'Pending').length,
        approved: leaves.filter(l => l.status === 'Approved').length,
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-[#f5f7f9]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium tracking-wide">Fetching leave applications...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f7f9] -m-6 p-6">
            <div className="max-w-[1400px] mx-auto space-y-4">
                {/* Zoho Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <CalendarDays className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Leave Approvals</h1>
                            <p className="text-[12px] text-slate-500 font-medium">Review and manage team leave requests</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-8 border-r border-slate-100 pr-8">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Requests</p>
                                <p className="text-lg font-bold text-slate-800">{stats.total}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">Pending</p>
                                <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Approved</p>
                                <p className="text-lg font-bold text-emerald-600">{stats.approved}</p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm brand-shadow">
                            <Download className="w-3.5 h-3.5" />
                            Report
                        </button>
                    </div>
                </div>

                {/* Zoho Controls */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or type..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all text-[13px]"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 text-[13px] font-medium transition-colors">
                            <Filter className="w-4 h-4" />
                            Filters
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex bg-slate-50 p-1 rounded-md border border-slate-200">
                        {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setSearchTerm(status === 'All' ? '' : status)}
                                className={clsx(
                                    "px-5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-tight transition-all",
                                    (searchTerm === status || (status === 'All' && searchTerm === '')) ? 'bg-white text-blue-600 shadow-sm border border-slate-200 brand-shadow' : 'text-slate-500 hover:text-slate-800'
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Zoho Table Container */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Leave Details</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-full">
                                            <Calendar className="w-12 h-12 text-slate-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">No requests found</h3>
                                            <p className="text-sm text-slate-400 max-w-xs mx-auto">No leave applications matching your search criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((record) => (
                                    <tr key={record._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shadow-sm">
                                                    {record.userId.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-[14px] hover:text-blue-600 cursor-pointer transition-colors">{record.userId.name}</p>
                                                    <p className="text-[11px] text-slate-500 font-medium">{record.userId.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                                                    {record.type}
                                                </span>
                                                <p className="text-xs text-slate-500 line-clamp-1 italic max-w-[200px]" title={record.reason}>
                                                    "{record.reason}"
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-slate-700">
                                                    {moment(record.startDate).format("MMM DD, YYYY")}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    to {moment(record.endDate).format("MMM DD, YYYY")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                                record.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                    record.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                        "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>
                                                <span className={clsx(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    record.status === 'Pending' ? "bg-amber-400" :
                                                        record.status === 'Approved' ? "bg-emerald-400" : "bg-rose-400"
                                                )}></span>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {record.status === 'Pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(record._id, 'Approved')}
                                                        disabled={actioningId === record._id}
                                                        className="px-3 py-1.5 bg-emerald-500 text-white text-[11px] font-bold rounded hover:bg-emerald-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {actioningId === record._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(record._id, 'Rejected')}
                                                        disabled={actioningId === record._id}
                                                        className="px-3 py-1.5 bg-white text-rose-500 border border-rose-200 text-[11px] font-bold rounded hover:bg-rose-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-bold text-slate-300 uppercase italic">Actioned</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                                ))}
                        </tbody>
                    </table>
                </div>

                {/* Info Cards - Zoho style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1">Dual Approval System</h4>
                            <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
                                Approved requests will be forwarded to HR for final processing. Managers are responsible for ensuring team capacity before approving.
                            </p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1">Consistency Guaranteed</h4>
                            <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
                                The leave balance of employees will be automatically updated once the final HR approval is granted.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center px-4 py-2 text-[11px] text-slate-400 font-medium">
                    <p>Showing {filtered.length} of {leaves.length} records</p>
                </div>
            </div>
        </div>
    );
}
