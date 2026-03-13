"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    Trophy, Search, Download, Calendar, 
    RefreshCw, AlertCircle, Filter, Mail, User,
    PartyPopper, ExternalLink
} from "lucide-react";
import { toast } from "react-hot-toast";
import moment from "moment";
import clsx from "clsx";

export default function AnniversariesPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [timeFilter, setTimeFilter] = useState("today");
    const [deptFilter, setDeptFilter] = useState("all");
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const res = await axios.get(`/api/users/anniversaries`, {
                params: { filter: timeFilter, department: deptFilter }
            });
            setUsers(res.data.users || []);
        } catch (error) {
            console.error("Failed to fetch anniversaries", error);
            toast.error("Failed to load anniversary records");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (session?.user) fetchData();
    }, [session?.user, timeFilter, deptFilter]);

    const isAdminHR = useMemo(() => {
        return ['Admin', 'HR', 'HR Manager'].includes(session?.user?.role as string);
    }, [session?.user?.role]);

    const filteredUsers = useMemo(() => {
        return users.filter((u: any) => {
            const name = (u.name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const search = searchTerm.toLowerCase();
            return name.includes(search) || email.includes(search);
        });
    }, [users, searchTerm]);

    const departments = useMemo(() => {
        const depts = new Set(users.map(u => u.department).filter(Boolean));
        return ['all', ...Array.from(depts)];
    }, [users]);

    if (!isAdminHR) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
                <AlertCircle className="w-14 h-14 text-gray-300 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700">Access Restricted</h3>
                <p className="text-sm mt-1">Work anniversary tracking is reserved for Admin and HR roles.</p>
                <button onClick={() => router.back()} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] -m-6 p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Trophy className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Work Anniversaries</h1>
                            <p className="text-[14px] font-medium text-slate-500 mt-1">Celebrate your team's loyalty and milestones</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-6">
                    <div className="relative flex-1 w-full lg:w-auto">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all font-medium"
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'week', label: 'This Week' },
                                { id: 'month', label: 'This Month' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setTimeFilter(opt.id)}
                                    className={clsx(
                                        "px-4 py-2 text-[12px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        timeFilter === opt.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select 
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none min-w-[140px]"
                            >
                                <option value="all">All Departments</option>
                                {departments.map(d => d !== 'all' && <option key={d} value={d}>{d}</option>)}
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
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Milestone</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Join Date</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Anniversary</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-24 text-center">
                                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Syncing Milestones...</p>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-24 text-center text-slate-400">
                                            <PartyPopper className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p className="font-bold text-lg text-slate-600">No milestones {timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'this week' : 'this month'}</p>
                                            <p className="text-sm mt-1">Great culture breeds great loyalty!</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u: any) => (
                                        <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                                        {u.name?.[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{u.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-500">{u.designation || 'Team Member'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                                                    {u.department || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="text-lg font-black text-indigo-600 leading-none">{u.yearsCompleted}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-tighter">Years</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                                                {moment(u.joinDate).format('MMM DD, YYYY')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-rose-500" />
                                                    <span className="text-sm font-bold text-slate-900">{u.anniversaryDate}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={() => toast.success(`Congratulatory message sent to ${u.name}!`)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all border border-indigo-100"
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                    Celebrate
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Insight */}
                {filteredUsers.length > 0 && (
                    <div className="bg-indigo-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-indigo-100 relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="text-lg font-bold">Milestone Summary</h4>
                            <p className="text-indigo-100 text-sm opacity-90">You have {filteredUsers.length} anniversaries to celebrate in this view.</p>
                        </div>
                        <PartyPopper className="w-16 h-16 text-white/10 absolute right-4 bottom-[-10px] rotate-12" />
                    </div>
                )}
            </div>
        </div>
    );
}
