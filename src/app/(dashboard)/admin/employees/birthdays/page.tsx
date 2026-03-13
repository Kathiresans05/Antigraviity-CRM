"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    Gift, Search, Download, Calendar, 
    RefreshCw, AlertCircle, Filter, PartyPopper, 
    Cake, Heart, Send, User, ExternalLink
} from "lucide-react";
import { toast } from "react-hot-toast";
import moment from "moment";
import clsx from "clsx";

export default function BirthdaysPage() {
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
            const res = await axios.get(`/api/users/birthdays`, {
                params: { filter: timeFilter, department: deptFilter }
            });
            setUsers(res.data.users || []);
        } catch (error) {
            console.error("Failed to fetch birthdays", error);
            toast.error("Failed to load birthday records");
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
                <p className="text-sm mt-1">Birthday tracking is reserved for Admin and HR roles.</p>
                <button onClick={() => router.back()} className="mt-6 px-6 py-2 bg-pink-600 text-white rounded-lg shadow-sm font-bold transition-all">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] -m-6 p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-200">
                            <Cake className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Birthdays</h1>
                            <p className="text-[14px] font-medium text-slate-500 mt-1">Celebrate your team and spread the joy!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                            Sync Birthdays
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-6">
                    <div className="relative flex-1 w-full lg:w-auto">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Find a birthday star..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-600/20 transition-all font-medium"
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
                                        timeFilter === opt.id ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
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

                {/* Sections */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Main Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Age</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Birthday Date</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-24 text-center">
                                                <RefreshCw className="w-8 h-8 text-pink-600 animate-spin mx-auto mb-4" />
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Syncing Celebrations...</p>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-24 text-center text-slate-400">
                                                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                                <p className="font-bold text-lg text-slate-600">No birthdays {timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'this week' : 'this month'}</p>
                                                <p className="text-sm mt-1">Peace and quiet before the next party!</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u: any) => (
                                            <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">
                                                            {u.name?.[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{u.name}</p>
                                                            <p className="text-[11px] font-medium text-slate-500">{u.designation || 'Team Member'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="px-3 py-1 rounded-lg bg-pink-50 text-pink-700 text-[11px] font-bold border border-pink-100/50">
                                                        {u.department || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{u.age}</span>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                                                    {u.dob ? moment(u.dob).format('MMM DD, YYYY') : 'Not Set'}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <PartyPopper className="w-4 h-4 text-pink-500" />
                                                        <span className="text-sm font-bold text-slate-900">{u.birthdayDate}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => toast.success(`Birthday wishes sent to ${u.name}! 🎂`)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm shadow-pink-100"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            Wish
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Birthday Summary Card */}
                {filteredUsers.length > 0 && (
                    <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl shadow-pink-100">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                Celebration Hub <PartyPopper className="w-6 h-6" />
                            </h2>
                            <p className="text-pink-50 font-medium mt-1">There are {filteredUsers.length} birthdays scheduled in this view. Make them special!</p>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                             <button 
                                onClick={() => toast.success("Feature coming soon!")}
                                className="px-6 py-3 bg-white text-pink-600 text-sm font-bold rounded-xl hover:bg-pink-50 transition-all"
                            >
                                Export Schedule
                             </button>
                        </div>
                        <Cake className="w-32 h-32 text-white/10 absolute right-[-20px] bottom-[-20px] rotate-[-15deg]" />
                    </div>
                )}
            </div>
        </div>
    );
}
