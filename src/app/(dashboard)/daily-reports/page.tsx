"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    CheckSquare, Search, Filter, Loader2, Users, Calendar,
    ArrowRight, ChevronDown, Download, CheckCircle2, X,
    Clock, Coffee, Hourglass, ExternalLink, FileText
} from "lucide-react";
import axios from "axios";
import Modal from "@/components/Modal";
import moment from "moment";
import clsx from "clsx";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    Present: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Present" },
    Late: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Late" },
    'Half Day': { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Half Day" },
    'Early Logout': { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", label: "Early Logout" },
    Absent: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Absent" },
    'On Leave': { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", label: "On Leave" },
    'Auto Closed': { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400", label: "Auto Closed" },
    'Holiday': { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", label: "Holiday" },
    'Offline': { bg: "bg-slate-50", text: "text-slate-400", dot: "bg-slate-300", label: "Offline" },
};

export default function DailyReportsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<"checklists" | "summaries">("checklists");
    const [checklists, setChecklists] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Tick every 30s to update live Net Hours for active employees
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const attendanceMap = React.useMemo(() => {
        const map: Record<string, any> = {};
        attendance.forEach(att => {
            if (!att.userId) return;
            const uId = typeof att.userId === 'object' ? att.userId._id : att.userId;
            const key = `${uId}_${moment(att.date).format('YYYY-MM-DD')}`;
            map[key] = att;
        });
        return map;
    }, [attendance]);
    const [expandedTls, setExpandedTls] = useState<string[]>([]);

    const managerId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    useEffect(() => {
        if (activeTab === "checklists") {
            fetchChecklists();
        } else {
            fetchAttendance();
        }
    }, [activeTab]);

    const fetchChecklists = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/daily-checklist");
            setChecklists(res.data.records || []);
        } catch (error) {
            console.error("Failed to fetch checklists", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/attendance");
            setAttendance(res.data.records || []);
        } catch (error) {
            console.error("Failed to fetch attendance records", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const allRecords: any[] = [];
        attendanceReports.forEach((rec: any) => {
            allRecords.push(rec);
        });

        const fmtHours = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`; };
        const headers = ['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Net Hours', 'Break (mins)', 'Status', 'Daily Summary'];
        const rows = allRecords.map((r: any) => [
            r.userId?.name || 'Unknown',
            r.userId?.department || 'General',
            moment(r.date).format('DD MMM YYYY'),
            r.clockInTime ? moment(r.clockInTime).format('hh:mm A') : '--',
            r.clockOutTime ? moment(r.clockOutTime).format('hh:mm A') : (r.clockInTime ? 'Active' : '--'),
            r.totalHours ? fmtHours(r.totalHours) : '--',
            Math.round(r.breakMinutes || 0),
            r.status || '--',
            `"${(r.workStatusUpload || '').replace(/"/g, "'")}"`,
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Team_Attendance_${moment().format('MMM_YYYY')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isDirectReport = (user: any) => {
        if (!user) return false;
        const managerIdStr = String(managerId);
        const uManagerId = user.reportingManager?._id || user.reportingManager;
        const uTLId = user.teamLeader?._id || user.teamLeader;

        // TL: strictly only show employees whose teamLeader is this TL
        if (userRole === 'TL') {
            return !!(uTLId && String(uTLId) === managerIdStr);
        }

        const reportsDirectly = uManagerId && String(uManagerId) === managerIdStr;
        const managementRoles = ['Manager', 'Admin', 'HR Manager', 'HR', 'Assigned Manager'];
        const isManagementView = managementRoles.includes(userRole || '');

        if (isManagementView) {
            // Managers see TLs directly reporting to them + employees without TL
            return !!(reportsDirectly);
        }

        return !!(reportsDirectly);
    };

    const getSubordinates = (tlId: string, data: any[]) => {
        return data.filter((record: any) => {
            const user = record.userId;
            if (!user) return false;
            const uTLId = user.teamLeader?._id || user.teamLeader;
            return uTLId && String(uTLId) === String(tlId) && user.role === 'Employee';
        });
    };

    const filteredChecklists = checklists.filter((checklist: any) => {
        const userName = checklist.userId?.name || checklist.userId?.email || "";
        const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase());
        const count = checklist.items.filter((i: any) => i.completed).length;
        const pct = Math.round((count / checklist.items.length) * 100);
        if (filterStatus === "completed") return pct === 100 && matchesSearch;
        if (filterStatus === "pending") return pct < 100 && matchesSearch;
        return matchesSearch;
    });

    const checklistReports = filteredChecklists.filter(c => isDirectReport(c.userId));

    const filteredAttendance = attendance.filter((record: any) => {
        const userName = record.userId?.name || record.userId?.email || "";
        const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const attendanceReports = filteredAttendance.filter(a => isDirectReport(a.userId));

    // For TLs: show only their team members (already filtered above)
    // For Managers: show TLs + their subordinates
    const allAttendanceRecords = React.useMemo(() => {
        if (userRole === 'TL') {
            return attendanceReports;
        }
        const flat: any[] = [];
        attendanceReports.forEach(mainRecord => {
            flat.push(mainRecord);
            const subs = getSubordinates(mainRecord.userId?._id, filteredAttendance);
            flat.push(...subs);
        });
        return flat;
    }, [attendanceReports, filteredAttendance, userRole]);

    const stats = {
        total: checklistReports.length,
        completed: checklistReports.filter((c: any) => c.items.every((i: any) => i.completed)).length,
        pending: checklistReports.length - checklistReports.filter((c: any) => c.items.every((i: any) => i.completed)).length,
    };

    if (loading && (activeTab === "checklists" ? checklists.length === 0 : attendance.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-[#f5f7f9]">
                <Loader2 className="w-8 h-8 text-[#1F6F8B] animate-spin mb-4" />
                <p className="text-slate-500 font-medium tracking-wide">Fetching team records...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f7f9] -m-6 p-6">
            <div className="max-w-[1400px] mx-auto space-y-4">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-[#1F6F8B]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Team Performance Reports</h1>
                            <p className="text-[12px] text-slate-500 font-medium">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-8 border-r border-slate-100 pr-8">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Team Size</p>
                                <p className="text-lg font-bold text-slate-800">{stats.total}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Checklist Pct</p>
                                <p className="text-lg font-bold text-emerald-600">
                                    {checklists.length > 0 ? Math.round((stats.completed / checklists.length) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                            title="Export as Excel/CSV for salary calculation"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export XL
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit shadow-sm">
                    <button
                        onClick={() => setActiveTab("checklists")}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === "checklists" ? "bg-[#1F6F8B] text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        Activity Checklists
                    </button>
                    <button
                        onClick={() => setActiveTab("summaries")}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === "summaries" ? "bg-[#1F6F8B] text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        Work Summaries
                    </button>
                </div>

                {/* Controls */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Find by employee name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-[#1F6F8B]/20 focus:border-[#1F6F8B] focus:bg-white transition-all text-[13px]"
                            />
                        </div>
                    </div>

                    {activeTab === "checklists" && (
                        <div className="flex bg-slate-50 p-1 rounded-md border border-slate-200">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'pending', label: 'Processing' },
                                { id: 'completed', label: 'Closed' }
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => setFilterStatus(btn.id)}
                                    className={`px-5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-tight transition-all ${filterStatus === btn.id ? 'bg-white text-[#1F6F8B] shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    {activeTab === "checklists" ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[22%]">Employee Details</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[12%] text-center">Clock In</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[12%] text-center">Clock Out</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[15%]">Today's Progress</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[20%]">Work Summary</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {checklistReports.map((checklist: any) => {
                                    const count = checklist.items.filter((i: any) => i.completed).length;
                                    const total = checklist.items.length;
                                    const pct = Math.round((count / total) * 100);
                                    const userName = checklist.userId?.name || checklist.userId?.email || "Unknown";
                                    const isTL = checklist.userId?.role === 'TL';
                                    const isExpanded = expandedTls.includes(checklist.userId?._id);
                                    const subordinates = getSubordinates(checklist.userId?._id, filteredChecklists);

                                    const attKey = `${checklist.userId?._id}_${moment(checklist.date).format('YYYY-MM-DD')}`;
                                    const attRecord = attendanceMap[attKey];

                                    return (
                                        <React.Fragment key={checklist._id}>
                                            <tr className={clsx("hover:bg-slate-50/50 transition-colors group", isExpanded && "bg-blue-50/10")}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {subordinates.length > 0 && (
                                                            <button
                                                                onClick={() => setExpandedTls(prev => prev.includes(checklist.userId?._id) ? prev.filter(id => id !== checklist.userId?._id) : [...prev, checklist.userId?._id])}
                                                                className="p-1 hover:bg-slate-100 rounded text-slate-400"
                                                            >
                                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        <div className={clsx(
                                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm",
                                                            isTL ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                        )}>
                                                            {userName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-[14px] hover:text-[#1F6F8B] cursor-pointer transition-colors">
                                                                {userName}
                                                                {isTL && <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded uppercase">TL</span>}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 font-medium">Reporting to you</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[13px] font-bold text-slate-600">
                                                        {attRecord?.clockInTime ? moment(attRecord.clockInTime).format("hh:mm A") : "--:--"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[13px] font-bold text-slate-600">
                                                        {attRecord?.clockOutTime ? (
                                                            moment(attRecord.clockOutTime).format("hh:mm A")
                                                        ) : (attRecord?.clockInTime && moment(attRecord.clockInTime).isValid()) ? (
                                                            <span className="text-emerald-500 font-black">Active</span>
                                                        ) : (
                                                            "--:--"
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className={pct === 100 ? 'text-emerald-600' : 'text-slate-500'}>{pct}%</span>
                                                            <span className="text-slate-400">{count}/{total}</span>
                                                        </div>
                                                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#1F6F8B]'}`}
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[11px] text-slate-500 line-clamp-1 italic font-medium flex-1" title={attRecord?.workStatusUpload}>
                                                            {attRecord?.workStatusUpload || "--"}
                                                        </p>
                                                        {attRecord?.workStatusFile && (
                                                            <a
                                                                href={attRecord.workStatusFile}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[#1F6F8B] hover:text-slate-900"
                                                                title="Download ZIP"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRecord(checklist);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="text-[12px] font-bold text-[#1F6F8B] hover:underline flex items-center gap-1 ml-auto group-hover:translate-x-1 transition-transform"
                                                    >
                                                        Review Report
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && subordinates.map((sub: any) => {
                                                const sCount = sub.items.filter((i: any) => i.completed).length;
                                                const sTotal = sub.items.length;
                                                const sPct = Math.round((sCount / sTotal) * 100);
                                                const sAttKey = `${sub.userId?._id}_${moment(sub.date).format('YYYY-MM-DD')}`;
                                                const sAttRecord = attendanceMap[sAttKey];
                                                return (
                                                    <tr key={sub._id} className="bg-slate-50/30 group/sub">
                                                        <td className="px-6 py-3 pl-16">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                                                                    {sub.userId?.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-700">{sub.userId?.name}</p>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Team Member</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <span className="text-[11px] font-bold text-slate-400">
                                                                {sAttRecord?.clockInTime ? moment(sAttRecord.clockInTime).format('hh:mm A') : '--:--'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <span className="text-[11px] font-bold text-slate-400">
                                                                {sAttRecord?.clockOutTime ? (
                                                                    moment(sAttRecord.clockOutTime).format('hh:mm A')
                                                                ) : (sAttRecord?.clockInTime && moment(sAttRecord.clockInTime).isValid()) ? (
                                                                    <span className="text-emerald-500 font-bold uppercase text-[9px]">Active</span>
                                                                ) : (
                                                                    '--:--'
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-400" style={{ width: `${sPct}%` }}></div>
                                                            </div>
                                                            <div className="flex justify-between mt-1">
                                                                <span className="text-[9px] font-bold text-slate-400">{sPct}%</span>
                                                                <span className="text-[9px] font-bold text-slate-300">{sCount}/{sTotal}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-slate-400 line-clamp-1 italic italic flex-1" title={sAttRecord?.workStatusUpload}>
                                                                    {sAttRecord?.workStatusUpload || "--"}
                                                                </p>
                                                                {sAttRecord?.workStatusFile && (
                                                                    <a href={sAttRecord.workStatusFile} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-[#1F6F8B]">
                                                                        <Download className="w-3 h-3" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <button
                                                                onClick={() => { setSelectedRecord(sub); setIsModalOpen(true); }}
                                                                className="text-[11px] font-bold text-slate-400 hover:text-[#1F6F8B]"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[980px]">
                                <colgroup>
                                    <col style={{ width: '200px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '80px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '80px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '100px' }} />
                                </colgroup>
                                <thead>
                                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Name</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Date</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Clock In</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Late</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Clock Out</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Break</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Net Hours</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Status</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                        const seen = new Set<string>();
                                        const allRecords: any[] = [];
                                        attendanceReports.forEach(mainRecord => {
                                            if (!seen.has(mainRecord._id)) {
                                                seen.add(mainRecord._id);
                                                allRecords.push(mainRecord);
                                            }
                                            const subs = getSubordinates(mainRecord.userId?._id, filteredAttendance);
                                            subs.forEach((sub: any) => {
                                                if (!seen.has(sub._id)) {
                                                    seen.add(sub._id);
                                                    allRecords.push(sub);
                                                }
                                            });
                                        });

                                        const formatNetHours = (hours: number) => {
                                            const totalMins = Math.round(hours * 60);
                                            const h = Math.floor(totalMins / 60);
                                            const m = totalMins % 60;
                                            return `${h}h ${String(m).padStart(2, '0')}m`;
                                        };

                                        const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
                                            Present:      { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Present' },
                                            'Full Day':   { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Full Day' },
                                            Late:         { bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Late' },
                                            'Half Day':   { bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'Half Day' },
                                            'Early Logout':{ bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'Early Logout' },
                                            Absent:       { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Absent' },
                                            'On Leave':   { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'On Leave' },
                                            ACTIVE:       { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Active' },
                                            Active:       { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Active' },
                                            'Auto Closed':{ bg: 'bg-slate-50',    text: 'text-slate-600',   dot: 'bg-slate-400',   label: 'Auto Closed' },
                                        };

                                        return allRecords.length > 0 ? allRecords.map((record: any, idx: number) => {
                                            const isTL = record.userId?.role === 'TL';
                                            const userName = record.userId?.name || 'Unknown';
                                            const empId = record.userId?.employeeId || record.userId?.empId || null;
                                            const rawStatus = record.status || '';
                                            const badge = STATUS_BADGE[rawStatus] || { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400', label: rawStatus || 'Unknown' };
                                            const isActive = record.clockInTime && !record.clockOutTime;

                                            // Net hours display
                                            let netHoursNode: React.ReactNode = <span className="text-slate-300 font-bold text-[13px]">--</span>;
                                            if (isActive) {
                                                const elapsedMs = now - new Date(record.clockInTime).getTime();
                                                const breakMs = (record.breakMinutes || 0) * 60000;
                                                const netH = Math.max(0, (elapsedMs - breakMs) / 3600000);
                                                netHoursNode = (
                                                    <span className="inline-flex items-center gap-1.5 text-[13px] font-black text-emerald-600">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                                        {formatNetHours(netH)}
                                                    </span>
                                                );
                                            } else if (record.totalHours) {
                                                netHoursNode = (
                                                    <span className="text-[13px] font-black text-[#1F6F8B]">
                                                        {formatNetHours(record.totalHours)}
                                                    </span>
                                                );
                                            }

                                            return (
                                                <tr
                                                    key={`${record._id}_${idx}`}
                                                    className="hover:bg-blue-50/30 transition-colors group border-b border-slate-100 last:border-b-0"
                                                >
                                                    {/* Name */}
                                                    <td className="px-5 py-3.5 text-left">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={clsx(
                                                                "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 flex-shrink-0 shadow-sm",
                                                                isTL ? "bg-blue-100 text-[#1F6F8B] border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            )}>
                                                                {userName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-[13px] leading-tight flex items-center gap-1.5">
                                                                    {userName}
                                                                    {isTL && <span className="px-1 py-0.5 bg-blue-50 text-[#1F6F8B] text-[9px] rounded uppercase font-black border border-blue-100">TL</span>}
                                                                </p>
                                                                {empId && (
                                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{empId}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-5 py-3.5 text-left">
                                                        <p className="text-[12px] font-bold text-slate-700 leading-tight">
                                                            {moment(record.date).format('DD MMM YYYY')}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {moment(record.date).format('dddd')}
                                                        </p>
                                                    </td>

                                                    {/* Clock In */}
                                                    <td className="px-5 py-3.5 text-center">
                                                        {record.clockInTime ? (
                                                            <span className="text-[13px] font-bold text-slate-700">
                                                                {moment(record.clockInTime).format('hh:mm A')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 font-bold text-[13px]">--</span>
                                                        )}
                                                    </td>

                                                    {/* Late */}
                                                    <td className="px-5 py-3.5 text-center">
                                                        {record.isLate && record.lateMinutes > 0 ? (
                                                            <span className="text-[12px] font-bold text-orange-500">
                                                                {record.lateMinutes}m
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 font-bold text-[12px]">--</span>
                                                        )}
                                                    </td>

                                                    {/* Clock Out */}
                                                    <td className="px-5 py-3.5 text-center">
                                                        {record.clockOutTime ? (
                                                            <span className="text-[13px] font-bold text-slate-700">
                                                                {moment(record.clockOutTime).format('hh:mm A')}
                                                            </span>
                                                        ) : isActive ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 font-bold text-[13px]">--</span>
                                                        )}
                                                    </td>

                                                    {/* Break */}
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="text-[12px] font-semibold text-slate-500">
                                                            {Math.round(record.breakMinutes || 0)}m
                                                        </span>
                                                    </td>

                                                    {/* Net Hours */}
                                                    <td className="px-5 py-3.5 text-right">
                                                        {netHoursNode}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-5 py-3.5 text-left">
                                                        <div className={clsx(
                                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold',
                                                            badge.bg, badge.text
                                                        )}>
                                                            <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', badge.dot)} />
                                                            {badge.label}
                                                        </div>
                                                    </td>

                                                    {/* Action */}
                                                    <td className="px-5 py-3.5 text-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRecord({ ...record, items: record.items || [] });
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="text-[11px] font-bold text-[#1F6F8B] hover:text-white hover:bg-[#1F6F8B] px-3 py-1 rounded border border-[#1F6F8B]/30 hover:border-[#1F6F8B] transition-all"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-20 text-center">
                                                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                                    <p className="text-slate-400 font-medium">No attendance records found for your team.</p>
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}


                </div>

                {(activeTab === "checklists" ? filteredChecklists.length === 0 : filteredAttendance.length === 0) && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-slate-50 rounded-full">
                            <Users className="w-12 h-12 text-slate-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">No data found</h3>
                            <p className="text-sm text-slate-400 max-w-xs mx-auto">Try adjusting your filters or search.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Attendance Record Modal (Work Summaries tab) */}
            <Modal
                isOpen={isModalOpen && activeTab === "summaries"}
                onClose={() => setIsModalOpen(false)}
                title="Attendance Record"
                maxWidth="max-w-lg"
            >
                {selectedRecord && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="w-12 h-12 rounded-full bg-[#1F6F8B]/10 border-2 border-[#1F6F8B]/20 flex items-center justify-center text-[#1F6F8B] font-bold text-lg">
                                {(selectedRecord.userId?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-base">{selectedRecord.userId?.name || 'Unknown'}</h4>
                                <p className="text-xs text-slate-500">{selectedRecord.userId?.email}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</p>
                                <p className="text-sm font-bold text-slate-700">{moment(selectedRecord.date).format('DD MMM YYYY')}</p>
                                <p className="text-[10px] text-slate-400">{moment(selectedRecord.date).format('dddd')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Clock In', value: selectedRecord.clockInTime ? moment(selectedRecord.clockInTime).format('hh:mm A') : '--' },
                                { label: 'Clock Out', value: selectedRecord.clockOutTime ? moment(selectedRecord.clockOutTime).format('hh:mm A') : (selectedRecord.clockInTime ? 'Active' : '--') },
                                { label: 'Break', value: `${Math.round(selectedRecord.breakMinutes || 0)}m` },
                                { label: 'Net Hours', value: selectedRecord.totalHours ? (() => { const m = Math.round(selectedRecord.totalHours * 60); return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`; })() : '--' },
                            ].map(item => (
                                <div key={item.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                                    <p className="text-[15px] font-bold text-slate-800">{item.value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Work Summary</p>
                            <p className="text-[13px] text-slate-600 italic">{selectedRecord.workStatusUpload || '--'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button onClick={() => setIsModalOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <X className="w-4 h-4" /> Close
                            </button>
                            {selectedRecord.workStatusFile && (
                                <a
                                    href={selectedRecord.workStatusFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F6F8B]/10 text-[#1F6F8B] rounded-lg text-[12px] font-bold hover:bg-[#1F6F8B]/20 transition-colors border border-[#1F6F8B]/20"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download ZIP
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Checklist View Modal */}
            <Modal
                isOpen={isModalOpen && activeTab === "checklists"}
                onClose={() => setIsModalOpen(false)}
                title="Daily Activity Report"
                maxWidth="max-w-2xl"
            >
                {selectedRecord && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white border border-[#1F6F8B]/20 flex items-center justify-center text-[#1F6F8B] font-bold text-lg shadow-sm">
                                    {(selectedRecord.userId?.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-base">{selectedRecord.userId?.name || "Unknown User"}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{selectedRecord.userId?.email}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Report Date</p>
                                <p className="text-sm font-bold text-slate-700">{moment(selectedRecord.date).format("MMMM DD, YYYY")}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion Status</h5>
                                <span className="text-[14px] font-bold text-[#1F6F8B]">
                                    {Math.round((selectedRecord.items.filter((i: any) => i.completed).length / selectedRecord.items.length) * 100)}%
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                <div
                                    className="h-full bg-[#1F6F8B] rounded-full transition-all duration-1000"
                                    style={{ width: `${(selectedRecord.items.filter((i: any) => i.completed).length / selectedRecord.items.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activity Checklist</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedRecord.items.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}
                                    >
                                        {item.completed ? (
                                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0"></div>
                                        )}
                                        <span className={`text-[13px] font-medium ${item.completed ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            {item.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div >
    );
}
