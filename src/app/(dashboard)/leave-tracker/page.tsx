"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Calendar, Plus, Clock, CheckCircle, XCircle,
    FileText, Paperclip, User, ChevronDown,
    Info, AlertCircle, CheckCircle2, LayoutGrid,
    Backpack, Briefcase, HeartPulse, MoreVertical
} from "lucide-react";
import axios from "axios";
import clsx from "clsx";

export default function LeaveTrackerPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const canApprove = ["Admin", "Manager", "HR Manager"].includes(userRole);
    const canViewAll = ["Admin", "HR", "HR Manager"].includes(userRole);
    const isAdmin = canViewAll || userRole === "Manager"; // For showing employee column

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'apply' | 'balance'>('apply');
    const [showWarning, setShowWarning] = useState(false);
    const [warningMsg, setWarningMsg] = useState("");

    // Dynamic Leave Balances Calculation
    const calculateBalances = () => {
        const used: Record<string, number> = {
            "Earned Leave": 0,
            "Casual Leave": 0,
            "Sick Leave": 0,
            "CompOff": 0
        };

        const myEmail = session?.user?.email;

        records.forEach((record: any) => {
            if (record.userId?.email === myEmail && record.status !== 'Rejected' && used[record.type as keyof typeof used] !== undefined) {
                const calculatedDays = record.startDate && record.endDate
                    ? Math.ceil(Math.abs(new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                    : 0;
                used[record.type as keyof typeof used] += (record.totalDays || calculatedDays);
            }
        });

        return [
            { type: "Earned Leave", total: 12, count: Math.max(12 - used["Earned Leave"], 0), used: used["Earned Leave"], icon: <Briefcase className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50" },
            { type: "Casual Leave", total: 8, count: Math.max(8 - used["Casual Leave"], 0), used: used["Casual Leave"], icon: <LayoutGrid className="w-5 h-5 text-emerald-500" />, bg: "bg-emerald-50" },
            { type: "Sick Leave", total: 5, count: Math.max(5 - used["Sick Leave"], 0), used: used["Sick Leave"], icon: <HeartPulse className="w-5 h-5 text-rose-500" />, bg: "bg-rose-50" },
            { type: "CompOff", total: 2, count: Math.max(2 - used["CompOff"], 0), used: used["CompOff"], icon: <Clock className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50" },
        ];
    };

    const balances = calculateBalances();

    const [newLeave, setNewLeave] = useState({
        type: "Earned Leave",
        startDate: "",
        endDate: "",
        reason: "Personal Work",
        description: "",
        attachment: null,
        approver: "HR Manager"
    });

    const [totalDays, setTotalDays] = useState(0);

    // Auto calculate days
    useEffect(() => {
        if (newLeave.startDate && newLeave.endDate) {
            const start = new Date(newLeave.startDate);
            const end = new Date(newLeave.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setTotalDays(diffDays > 0 ? diffDays : 0);
        } else {
            setTotalDays(0);
        }
    }, [newLeave.startDate, newLeave.endDate]);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            const res = await axios.get("/api/leave");
            setRecords(res.data.records);
        } catch (error) {
            console.error("Failed to fetch leave records", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation check
        const balanceObj = balances.find(b => b.type === newLeave.type);
        const available = balanceObj?.count || 0;

        if (totalDays > available) {
            setWarningMsg(`Maximum number of leave days allowed is ${available}`);
            setShowWarning(true);
            return;
        }

        try {
            setLoading(true);
            await axios.post("/api/leave", {
                ...newLeave,
                totalDays
            });
            alert("Leave application submitted successfully!");
            setNewLeave({
                type: "Earned Leave",
                startDate: "",
                endDate: "",
                reason: "Personal Work",
                description: "",
                attachment: null,
                approver: "HR Manager"
            });
            fetchRecords();
        } catch (error) {
            alert("Failed to apply for leave. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (leaveId: string, status: 'Approved' | 'Rejected') => {
        try {
            await axios.patch("/api/leave", { leaveId, status });
            fetchRecords();
        } catch (error) {
            alert("Failed to update leave status.");
        }
    };

    if (loading && records.length === 0) {
        return (
            <div className="flex flex-col h-[70vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Loading Leave Module...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header section with Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Leave Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Plan and manage your work exemptions</p>
                </div>

                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex items-center">
                    <button
                        onClick={() => setActiveTab('apply')}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                            activeTab === 'apply' ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        Apply Leave
                    </button>
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                            activeTab === 'balance' ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        Leave Balance
                    </button>
                </div>
            </div>

            {activeTab === 'apply' ? (
                /* Apply Leave Tab Content */
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                    {/* Left Column: Form (60%) */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-500" />
                                <h3 className="font-semibold text-gray-800">Apply New Leave</h3>
                            </div>

                            <form onSubmit={handleApplyLeave} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 ml-1">Leave Type</label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={newLeave.type}
                                                onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                                                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                            >
                                                {balances.map(b => (
                                                    <option key={b.type} value={b.type}>{b.type}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 ml-1">Approver</label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={newLeave.approver}
                                                onChange={(e) => setNewLeave({ ...newLeave, approver: e.target.value })}
                                                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                            >
                                                <option value="HR Manager">HR Manager</option>
                                                <option value="Project Lead">Project Lead</option>
                                                <option value="Department Head">Department Head</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 ml-1">From Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                required
                                                value={newLeave.startDate}
                                                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 ml-1">To Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                required
                                                value={newLeave.endDate}
                                                onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {totalDays > 0 && (
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-5 h-5 text-blue-500" />
                                            <span className="text-sm font-semibold text-blue-700 tracking-tight">Total Duration calculated:</span>
                                        </div>
                                        <span className="text-lg font-bold text-blue-600">{totalDays} Day{totalDays > 1 ? 's' : ''}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Reason</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={newLeave.reason}
                                            onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="Personal Work">Personal Work</option>
                                            <option value="Medical Emergency">Medical Emergency</option>
                                            <option value="Family Function">Family Function</option>
                                            <option value="Travel">Travel</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Description (Optional)</label>
                                    <textarea
                                        rows={4}
                                        value={newLeave.description}
                                        onChange={(e) => setNewLeave({ ...newLeave, description: e.target.value })}
                                        placeholder="Add more details about your leave application..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Attachment (Image/PDF)</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-all cursor-pointer relative group">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setNewLeave({ ...newLeave, attachment: e.target.files?.[0] as any })}
                                        />
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Paperclip className="w-5 h-5" />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-500">
                                                {newLeave.attachment ? (newLeave.attachment as any).name : 'Click to upload or drag and drop'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Support: PDF, PNG, JPG (Max 5MB)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-blue-600 hover:opacity-90 text-white font-bold px-6 py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        Apply Leave
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewLeave({ ...newLeave, startDate: "", endDate: "", description: "" })}
                                        className="px-8 py-3.5 border border-gray-200 rounded-xl text-gray-400 font-semibold hover:bg-gray-50 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Balance Overview (40%) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    Leave Balance Summary
                                </h3>
                                <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-4">
                                    {balances.map((balance) => (
                                        <div key={balance.type} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 group hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx("p-2.5 rounded-xl", balance.bg, "group-hover:scale-110 transition-transform")}>
                                                    {balance.icon}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-800 tracking-tight">{balance.type}</span>
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Availability</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xl font-bold text-gray-900">{balance.count}</span>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase">Days</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-900/10 overflow-hidden relative">
                                    <div className="relative z-10">
                                        <h4 className="text-lg font-bold mb-1">Leave Policy</h4>
                                        <p className="text-xs text-blue-100 font-medium leading-relaxed">
                                            Please ensure to apply leaves at least 48 hours in advance for planned personal time.
                                        </p>
                                    </div>
                                    <Backpack className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Detailed Balance Tab Content */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {balances.map((balance) => (
                        <div key={balance.type} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="flex items-start justify-between relative z-10">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{balance.type}</p>
                                    <h3 className="text-3xl font-bold text-gray-900">{balance.total}</h3>
                                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">Total Entitlement</p>
                                </div>
                                <div className={`p-4 rounded-full ${balance.bg} group-hover:scale-110 transition-transform shadow-sm`}>
                                    {balance.icon}
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col gap-2 relative z-10">
                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full transition-all duration-1000", balance.bg.replace('bg-', 'bg-').replace('-50', '-500'))}
                                        style={{ width: `${(Math.min(balance.used, balance.total) / balance.total) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                    <span>Used: {balance.used}</span>
                                    <span>Remaining: {balance.count}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Application History (Always visible below or in a section) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Application Status History
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-400 text-[12px] uppercase font-semibold tracking-wider border-b border-gray-50">
                                {isAdmin && <th className="px-6 py-5">Employee</th>}
                                <th className="px-6 py-5">Leave Type</th>
                                <th className="px-6 py-5 text-center">Duration</th>
                                <th className="px-6 py-5">Reason</th>
                                <th className="px-6 py-5">Approver</th>
                                <th className="px-6 py-5 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {records.length > 0 ? records.map((record: any) => (
                                <tr key={record._id} className="hover:bg-blue-50/20 transition-colors group">
                                    {isAdmin && (
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-semibold text-gray-900">{record.userId?.name || 'Unknown'}</span>
                                                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-tight">{record.userId?.email}</span>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-semibold text-gray-800">{record.type}</span>
                                            <span className="text-[10px] text-gray-400 font-semibold uppercase">Category</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[13px] font-semibold text-gray-600">
                                                {new Date(record.startDate).toLocaleDateString()} - {new Date(record.endDate).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded mt-1">
                                                {record.totalDays || (record.startDate && record.endDate ? Math.ceil(Math.abs(new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0)} Days
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-[13px] text-gray-500 max-w-[200px] truncate" title={record.reason}>
                                            {record.reason}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <span className="text-[13px] font-semibold text-slate-600">{record.approver || 'Manager'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {record.status === 'Pending' && canApprove && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(record._id, 'Approved')}
                                                        className="p-1.5 px-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all text-[11px] font-bold border border-emerald-100 shadow-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(record._id, 'Rejected')}
                                                        className="p-1.5 px-3 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all text-[11px] font-bold border border-rose-100 shadow-sm"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {(record.status !== 'Pending' || !canApprove) && (
                                                <StatusBadge status={record.status} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle className="w-10 h-10 text-slate-200" />
                                            <p className="text-slate-400 font-bold">No leave applications found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Validation Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-8 text-center group">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Insufficient Balance</h3>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            {warningMsg}
                        </p>
                        <button
                            onClick={() => setShowWarning(false)}
                            className="w-full bg-[#1F6F8B] hover:bg-black text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-gray-200"
                        >
                            Okay, Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, any> = {
        Approved: { color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: <CheckCircle className="w-3 h-3" /> },
        Pending: { color: "bg-amber-50 text-amber-600 border-amber-100", icon: <Clock className="w-3 h-3" /> },
        Rejected: { color: "bg-red-50 text-red-600 border-red-100", icon: <XCircle className="w-3 h-3" /> },
    };
    const config = configs[status] || configs.Pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${config.color}`}>
            {config.icon}
            {status}
        </span>
    );
}
