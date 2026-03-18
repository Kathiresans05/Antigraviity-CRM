"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
    Users, ClipboardList, Search, Download, Calendar, 
    ChevronLeft, ChevronRight, AlertCircle, RefreshCw, 
    MoreHorizontal, CheckCircle2, XCircle, Clock, Save,
    User, Filter
} from "lucide-react";
import { toast } from "react-hot-toast";
import moment from "moment";
import clsx from "clsx";

/* ─── Status Config ────────────────────────────────── */
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    'Review Pending': { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Review Pending" },
    'Confirmed': { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Confirmed" },
    'Extended': { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Extended" },
};

function ProbationContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterTerm = searchParams.get('filter') || 'all';

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [refreshing, setRefreshing] = useState(false);

    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [pendingNotes, setPendingNotes] = useState("");

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const url = filterTerm === 'ending-soon' 
                ? `/api/users/probation?filter=ending-soon` 
                : "/api/users/probation";
            
            const res = await axios.get(url);
            setUsers(res.data.users || []);
        } catch (error) {
            console.error("Failed to fetch probation data", error);
            toast.error("Failed to sync probation records");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (session?.user) fetchData();
    }, [session?.user, filterTerm]);

    const isAdminHR = useMemo(() => {
        return ['Admin', 'HR', 'HR Manager'].includes(session?.user?.role as string);
    }, [session?.user?.role]);

    const filteredUsers = useMemo(() => {
        return users.filter((u: any) => {
            const name = (u.name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const search = searchTerm.toLowerCase();
            const matchesSearch = name.includes(search) || email.includes(search);
            const matchesStatus = statusFilter === 'all' || u.probationStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [users, searchTerm, statusFilter]);

    const handleAction = async (userId: string, status: string, notes?: string) => {
        try {
            const res = await axios.patch('/api/users/probation', {
                userId,
                probationStatus: status,
                probationNotes: notes
            });
            toast.success(res.data.message);
            fetchData();
            setShowNotesModal(false);
            setSelectedUser(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Action failed");
        }
    };

    const handleExtend = async (userId: string, currentEndDate: string) => {
        const newDate = moment(currentEndDate).add(3, 'months').format('YYYY-MM-DD');
        const confirmExtend = confirm(`Extend probation by 3 months until ${newDate}?`);
        if (!confirmExtend) return;

        try {
            const res = await axios.patch('/api/users/probation', {
                userId,
                probationStatus: 'Extended',
                probationEndDate: newDate
            });
            toast.success("Probation extended successfully");
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Extension failed");
        }
    };

    if (!isAdminHR) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
                <AlertCircle className="w-14 h-14 text-gray-300 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700">Access Restricted</h3>
                <p className="text-sm mt-1">This page is reserved for Admin and HR roles only.</p>
                <button onClick={() => router.back()} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-sm">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] -m-6 p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <ClipboardList className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Probation Management</h1>
                            <p className="text-[14px] font-medium text-slate-500 mt-1">
                                {filterTerm === 'ending-soon' ? "Reviewing employees with probation ending soon" : "Manage employee probation cycles and confirmations"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                            Sync Data
                        </button>
                    </div>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Under Review</span>
                           <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{users.filter(u => u.probationStatus === 'Review Pending').length}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Confirmed</span>
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{users.filter(u => u.probationStatus === 'Confirmed').length}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[11px] font-black uppercase tracking-widest text-blue-500">Extended</span>
                           <RefreshCw className="w-4 h-4 text-blue-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{users.filter(u => u.probationStatus === 'Extended').length}</h3>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-6">
                    <div className="relative flex-1 w-full lg:w-auto">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by employee name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600/20 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Review Pending">Review Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Extended">Extended</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Join Date</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">End Date</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Days Left</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Manager</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                                            <p className="text-sm font-bold text-slate-500">Loading records...</p>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                                            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="font-bold">No employees found for review</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u: any) => {
                                        const daysLeft = moment(u.probationEndDate).diff(moment(), 'days');
                                        const statusCfg = STATUS_CONFIG[u.probationStatus] || STATUS_CONFIG['Review Pending'];
                                        
                                        return (
                                            <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                                                            {u.name?.[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{u.name}</p>
                                                            <p className="text-[11px] font-medium text-slate-500">{u.designation || 'Specialist'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                                                    {moment(u.joinDate).format('MMM DD, YYYY')}
                                                </td>
                                                <td className="px-6 py-5 text-sm font-bold text-slate-900">
                                                    {moment(u.probationEndDate).format('MMM DD, YYYY')}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={clsx(
                                                        "text-[12px] font-black tracking-tight",
                                                        daysLeft <= 15 ? "text-rose-600" : daysLeft <= 30 ? "text-amber-600" : "text-emerald-600"
                                                    )}>
                                                        {daysLeft > 0 ? `${daysLeft} days` : daysLeft === 0 ? 'Ends Today' : 'Overdue'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-medium text-slate-500">
                                                    {u.reportingManager?.name || 'Not assigned'}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className={clsx(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                                                        statusCfg.bg, statusCfg.text, "border-white/50 shadow-sm"
                                                    )}>
                                                        <div className={clsx("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                                        {statusCfg.label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {u.probationStatus !== 'Confirmed' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleAction(u._id, 'Confirmed')}
                                                                    title="Confirm Employee"
                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleExtend(u._id, u.probationEndDate)}
                                                                    title="Extend Probation"
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                >
                                                                    <RefreshCw className="w-5 h-5" />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedUser(u);
                                                                setPendingNotes(u.probationNotes || "");
                                                                setShowNotesModal(true);
                                                            }}
                                                            title="Add Review Notes"
                                                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                                        >
                                                            <Save className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Notes Modal */}
                {showNotesModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900">Review Notes - {selectedUser?.name}</h3>
                                <button onClick={() => setShowNotesModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <XCircle className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <textarea 
                                    value={pendingNotes}
                                    onChange={(e) => setPendingNotes(e.target.value)}
                                    placeholder="Add notes about performance, areas of improvement, etc."
                                    className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600/20 text-sm font-medium resize-none"
                                />
                            </div>
                            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                                <button 
                                    onClick={() => handleAction(selectedUser._id, selectedUser.probationStatus, pendingNotes)}
                                    className="flex-1 py-3 bg-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
                                >
                                    Save Notes
                                </button>
                                <button 
                                    onClick={() => setShowNotesModal(false)}
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ProbationManagementPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>}>
            <ProbationContent />
        </Suspense>
    );
}
