"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Plus, Search, Filter, Loader2, Calendar,
    ChevronDown, Download, CheckCircle2, AlertCircle, Clock,
    ChevronRight, MoreVertical, Trash2, Edit3, Briefcase, User, Info, LayoutGrid, List
} from "lucide-react";
import axios from "axios";
import moment from "moment";
import clsx from "clsx";
import DailyReportModal from "@/frontend/components/DailyReportModal";

export default function DailyReportsPage() {
    const { data: session } = useSession();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<any>(null);
    const [expandedReport, setExpandedReport] = useState<string | null>(null);

    const userRole = (session?.user as any)?.role;
    const userName = session?.user?.name || "User";

    useEffect(() => {
        fetchReports();
    }, [selectedDate, searchQuery]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/daily-reports?date=${selectedDate}&search=${searchQuery}`);
            setReports(res.data.reports || []);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            await axios.delete(`/api/daily-reports/${id}`);
            fetchReports();
        } catch (error) {
            console.error("Failed to delete report", error);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedReport(expandedReport === id ? null : id);
    };

    const stats = {
        total: reports.length,
        completed: reports.filter(r => r.status === 'Completed').length,
        pending: reports.filter(r => r.status === 'Pending').length,
        totalHours: reports.reduce((acc, r) => acc + (r.totalHours || 0), 0)
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] -m-6 p-6">
            <div className="max-w-[1400px] mx-auto space-y-6">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daily Work Report</h1>
                            <p className="text-sm text-slate-500 font-medium">Manage and track daily team activities</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-48">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={() => { setEditingReport(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> New Report
                        </button>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                    
                    {/* LEFT PANEL: LIST (70%) */}
                    <div className="lg:col-span-7 space-y-4">
                        
                        {/* Search & Filter Bar */}
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search by project or employee..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-slate-200 outline-none transition-all"
                                />
                            </div>
                            <div className="hidden sm:flex items-center gap-2 px-4 border-l border-slate-100">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase">Filters</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-dashed border-slate-200">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading reports...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                    <List className="w-10 h-10" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">No reports submitted today</h3>
                                    <p className="text-sm text-slate-400 max-w-xs mx-auto">Get started by submitting your first work report for the day.</p>
                                </div>
                                <button 
                                    onClick={() => { setEditingReport(null); setIsModalOpen(true); }}
                                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                >
                                    Create Report
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reports.map((report) => (
                                    <div key={report._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="p-5 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100 shadow-sm">
                                                    {(report.userId?.name || 'U').charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h3 className="font-bold text-slate-800 truncate">{report.userId?.name}</h3>
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full uppercase font-black">
                                                            {report.userId?.role || 'EMP'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                        <Briefcase className="w-3.5 h-3.5" />
                                                        {report.projectName}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8 pr-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Time Logged</p>
                                                    <p className="text-sm font-black text-blue-600">{report.totalHours} Hrs</p>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <span className={clsx(
                                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                                        report.status === 'Completed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                                    )}>
                                                        <span className={clsx("w-1.5 h-1.5 rounded-full", report.status === 'Completed' ? "bg-emerald-500" : "bg-amber-500")} />
                                                        {report.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => toggleExpand(report._id)}
                                                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                                                >
                                                    <ChevronRight className={clsx("w-5 h-5 transition-transform", expandedReport === report._id && "rotate-90")} />
                                                </button>
                                                <div className="relative group">
                                                    <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setEditingReport(report); setIsModalOpen(true); }}
                                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" /> Edit
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(report._id); }}
                                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {expandedReport === report._id && (
                                            <div className="px-5 pb-5 pt-1 border-t border-slate-50 bg-slate-50/10 animate-in slide-in-from-top-2 duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                    <div className="space-y-4">
                                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-blue-500 pl-3">Tasks Breakdown</h4>
                                                        <div className="space-y-2">
                                                            {report.tasks.map((task: any, idx: number) => (
                                                                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800">{task.title}</p>
                                                                        <p className="text-[11px] text-slate-400 line-clamp-1">{task.description}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={clsx(
                                                                            "px-2 py-0.5 rounded-md text-[9px] font-black tracking-tight",
                                                                            task.status === 'Completed' ? "bg-emerald-50 text-emerald-600" :
                                                                            task.status === 'Blocked' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                                                                        )}>
                                                                            {task.status}
                                                                        </span>
                                                                        <span className="text-xs font-black text-slate-600">{task.timeSpent}h</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Daily Summary</h4>
                                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                                {report.summary}
                                                            </p>
                                                        </div>
                                                        {(report.blockers || report.tomorrowPlan) && (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {report.blockers && (
                                                                    <div className="bg-rose-50/30 p-3 rounded-xl border border-rose-100/50">
                                                                        <p className="text-[9px] font-black text-rose-500 uppercase mb-1">Blockers</p>
                                                                        <p className="text-xs text-slate-600 line-clamp-2">{report.blockers}</p>
                                                                    </div>
                                                                )}
                                                                {report.tomorrowPlan && (
                                                                    <div className="bg-amber-50/30 p-3 rounded-xl border border-amber-100/50">
                                                                        <p className="text-[9px] font-black text-amber-500 uppercase mb-1">Plan for Tomorrow</p>
                                                                        <p className="text-xs text-slate-600 line-clamp-2">{report.tomorrowPlan}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: METRICS (30%) */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-500" />
                                Today's Metrics
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                            <LayoutGrid className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600">Total Reports</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-800">{stats.total}</span>
                                </div>

                                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-400 transition-colors">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600">Completed</span>
                                    </div>
                                    <span className="text-xl font-black text-emerald-600">{stats.completed}</span>
                                </div>

                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-400 transition-colors">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600">Total Hours</span>
                                    </div>
                                    <span className="text-xl font-black text-blue-600">{stats.totalHours}h</span>
                                </div>

                                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-400 transition-colors">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600">Pending</span>
                                    </div>
                                    <span className="text-xl font-black text-amber-600">{stats.pending}</span>
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-200">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Company Goal</p>
                                <p className="text-xs font-bold leading-relaxed mb-4">Aim for 8 logged hours daily with zero blockers.</p>
                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalHours / 8) * 100)}%` }}></div>
                                </div>
                                <div className="mt-2 flex justify-between text-[10px] font-black">
                                    <span>{Math.round((stats.totalHours / 8) * 100)}% Target</span>
                                    <span>{stats.totalHours}/8 Hrs</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Help & Guidelines</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    <p className="text-[11px] text-slate-500 font-medium">Submit your reports before 7:00 PM daily.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    <p className="text-[11px] text-slate-500 font-medium">Clearly mention blockers for faster resolution.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    <p className="text-[11px] text-slate-500 font-medium">Link specific tasks to ongoing projects.</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <DailyReportModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingReport(null); }}
                onSuccess={fetchReports}
                report={editingReport}
                userName={userName}
            />
        </div>
    );
}
