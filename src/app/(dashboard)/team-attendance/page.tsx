"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    Users, UserCheck, UserX, Calendar as CalendarIcon,
    Search, Download, Clock, ChevronLeft, ChevronRight,
    AlertCircle, ArrowUpDown, Filter, MoreHorizontal, RefreshCw, Square, CheckCircle, XCircle,
    Activity, Gift
} from "lucide-react";
import { toast } from "react-hot-toast";
import moment from "moment";
import clsx from "clsx";

/* ─── Zoho-style Status Config ────────────────────────────────── */
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

export default function TeamAttendancePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [activeTab, setActiveTab] = useState<"day" | "week">("day");
    const [selectedDate, setSelectedDate] = useState(moment());
    const [refreshing, setRefreshing] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [holidays, setHolidays] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [usersRes, attendanceRes, holidaysRes] = await Promise.all([
                axios.get("/api/users?strict=true"),
                axios.get("/api/attendance"),
                axios.get("/api/holidays")
            ]);
            setTeamMembers(usersRes.data.users || []);
            setAttendanceRecords(attendanceRes.data.records || []);
            setHolidays(holidaysRes.data || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to sync team data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (session?.user?.id) fetchData();
        // Force sync with client local time on mount to avoid SSR hydration mismatch
        setSelectedDate(moment());
    }, [session?.user?.id]);

    const isManagement = ['Admin', 'Manager', 'HR', 'HR Manager', 'Assigned Manager', 'TL'].includes(session?.user?.role as string);

    /* ─── Date Navigation ─────────────────────────────────────── */
    const goToPrev = () => setSelectedDate(prev => prev.clone().subtract(1, activeTab === "day" ? "day" : "week"));
    const goToNext = () => setSelectedDate(prev => prev.clone().add(1, activeTab === "day" ? "day" : "week"));
    const goToToday = () => setSelectedDate(moment());

    const getRelativeLabel = (date: moment.Moment) => {
        const today = moment().startOf('day');
        const target = date.clone().startOf('day');
        const diff = target.diff(today, 'days');

        if (diff === 0) return "Today";
        if (diff === -1) return "Yesterday";
        if (diff === 1) return "Tomorrow";
        return date.format("MMM D");
    };

    const relativeLabel = useMemo(() => getRelativeLabel(selectedDate), [selectedDate]);

    const dateRange = useMemo(() => {
        if (activeTab === "day") {
            return { start: selectedDate.clone().startOf("day"), end: selectedDate.clone().endOf("day") };
        }
        return { start: selectedDate.clone().startOf("isoWeek"), end: selectedDate.clone().endOf("isoWeek") };
    }, [selectedDate, activeTab]);

    const dateLabel = useMemo(() => {
        if (activeTab === "day") return selectedDate.format("dddd, MMMM D, YYYY");
        return `${dateRange.start.format("MMM D")} – ${dateRange.end.format("MMM D, YYYY")}`;
    }, [selectedDate, activeTab, dateRange]);

    /* ─── Unified Data Merge (Users + Records) ────────────────── */
    const mergedRecords = useMemo(() => {
        // Find records within the date range
        const currentRecords = attendanceRecords.filter((r: any) => {
            const rDate = moment(r.date);
            return rDate.isBetween(dateRange.start, dateRange.end, undefined, "[]");
        });

        // For Day View, we want to show EVERY team member
        if (activeTab === "day") {
            return teamMembers.map(user => {
                const record = currentRecords.find(r => String(r.userId?._id || r.userId) === String(user._id));
                if (record) return { ...record, userDetails: user };

                // Determine default status for missing record
                let status = 'Offline';
                const now = moment();
                const selDate = selectedDate.clone().startOf('day');

                if (user.isActive) {
                    const isHoliday = holidays.some(h => moment(h.date).isSame(selDate, 'day'));
                    if (isHoliday) {
                        status = 'Holiday';
                    } else if (selDate.isBefore(now.clone().startOf('day'))) {
                        status = 'Absent';
                    } else if (selDate.isSame(now, 'day') && now.hour() >= 11) {
                        status = 'Absent';
                    }
                }

                return {
                    _id: `temp-${user._id}`,
                    userId: user,
                    userDetails: user,
                    date: selectedDate.toDate(),
                    status,
                    clockInTime: null,
                    clockOutTime: null,
                    totalHours: 0
                };
            });
        }

        // For Week View, just show existing records for now to avoid massive table
        return currentRecords.map(r => ({ ...r, userDetails: r.userId }));
    }, [teamMembers, attendanceRecords, dateRange, activeTab, selectedDate]);

    const filteredRecords = useMemo(() => {
        return mergedRecords.filter((r: any) => {
            const user = r.userDetails || r.userId;
            const name = (user?.name || "").toLowerCase();
            const email = (user?.email || "").toLowerCase();
            const dept = (user?.department || "").toLowerCase();
            const search = searchTerm.toLowerCase();

            const matchesSearch = name.includes(search) || email.includes(search) || dept.includes(search);

            let matchesStatus = statusFilter === "All" || r.status === statusFilter;

            // Special case for Pending Fix
            if (statusFilter === "Pending Fix") {
                matchesStatus = r.correctionRequested && r.correctionDetails?.status === 'Pending';
            }

            return matchesSearch && matchesStatus;
        });
    }, [mergedRecords, searchTerm, statusFilter]);

    /* ─── Stats (Based on search/date, NOT status filter) ────── */
    const stats = useMemo(() => {
        // Records filtered by date/search but BEFORE status filter
        const baseRecords = mergedRecords.filter((r: any) => {
            const user = r.userDetails || r.userId;
            const search = searchTerm.toLowerCase();
            return (user?.name || "").toLowerCase().includes(search) ||
                (user?.email || "").toLowerCase().includes(search) ||
                (user?.department || "").toLowerCase().includes(search);
        });

        const present = baseRecords.filter(r => ['Present', 'Late', 'Half Day'].includes(r.status)).length;
        const absent = baseRecords.filter(r => r.status === 'Absent').length;
        const leave = baseRecords.filter(r => r.status === 'On Leave').length;
        const late = baseRecords.filter(r => r.status === 'Late').length;
        const holiday = baseRecords.filter(r => r.status === 'Holiday').length;
        const corrections = baseRecords.filter(r => r.correctionRequested && r.correctionDetails?.status === 'Pending').length;
        const total = baseRecords.length;

        return { present, absent, leave, late, holiday, corrections, total };
    }, [mergedRecords, searchTerm]);

    const handleCorrectionAction = async (action: 'approveCorrection' | 'rejectCorrection') => {
        if (!selectedRecord) return;
        setActionLoading(true);
        try {
            await axios.post("/api/attendance/action", {
                action,
                recordId: selectedRecord._id
            });
            toast.success(action === 'approveCorrection' ? "Correction Approved" : "Correction Rejected");
            setShowCorrectionModal(false);
            setSelectedRecord(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    if (!isManagement) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
                <AlertCircle className="w-14 h-14 text-gray-300 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 font-sans">Access Restricted</h3>
                <p className="text-sm mt-1">This page is accessible only to Managers and Team Leaders.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] -m-6">
            {/* ─── Minimalist Integrated Header ──────────────────────────── */}
            <div className="bg-white px-8 pt-8 pb-2 shadow-sm border-b border-slate-200">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-2 mb-4">
                        <span
                            onClick={() => router.push("/team-attendance")}
                            className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide hover:text-slate-700 cursor-pointer transition-colors"
                        >
                            Attendance
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-[11px] text-slate-900 font-bold uppercase tracking-wide">Team Monitoring</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                                <Users className="w-6 h-6 text-slate-700" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Attendance</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-0.5">
                                    Monitoring <span className="text-slate-900 font-semibold">{teamMembers.length}</span> reportees
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchData}
                                className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")} />
                                Sync Data
                            </button>
                            <button className="flex items-center gap-2 px-6 py-2 text-[12px] font-semibold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 transition-all shadow-sm brand-shadow">
                                <Download className="w-3.5 h-3.5" />
                                Export Reports
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mt-8">
                        {["day", "week"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={clsx(
                                    "px-4 py-3 text-[13px] font-semibold capitalize transition-all relative",
                                    activeTab === tab
                                        ? "text-blue-600"
                                        : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                {tab} View
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto">
                {/* KPI Section - Minimalist & Functional */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                    <SummaryCard
                        label="Total Team" value={stats.total} color="#475569" icon={<Users />} badge="+0%" subLabel="Active"
                        isActive={statusFilter === "All"} onClick={() => setStatusFilter("All")}
                    />
                    <SummaryCard
                        label={`Present ${relativeLabel}`} value={stats.present} color="#059669" icon={<UserCheck />} badge="Normal" subLabel={selectedDate.format("MMM D")}
                        isActive={statusFilter === "Present"} onClick={() => setStatusFilter("Present")}
                    />
                    <SummaryCard
                        label={`Absent ${relativeLabel}`} value={stats.absent} color="#dc2626" icon={<UserX />}
                        badge={stats.absent > 0 ? "Action Required" : "None"} subLabel="Daily Metric"
                        isActive={statusFilter === "Absent"} onClick={() => setStatusFilter("Absent")}
                    />
                    <SummaryCard
                        label={`On Leave ${relativeLabel}`} value={stats.leave} color="#7c3aed" icon={<CalendarIcon />} badge="0%" subLabel="Approved"
                        isActive={statusFilter === "On Leave"} onClick={() => setStatusFilter("On Leave")}
                    />
                    <SummaryCard
                        label="Late In" value={stats.late} color="#d97706" icon={<Clock />} badge="Low" subLabel="Metric"
                        isActive={statusFilter === "Late"} onClick={() => setStatusFilter("Late")}
                    />
                    <SummaryCard
                        label={`Holidays`} value={stats.holiday} color="#6366f1" icon={<Gift className="w-5 h-5" />} badge="Fixed" subLabel="Calendar"
                        isActive={statusFilter === "Holiday"} onClick={() => setStatusFilter("Holiday")}
                    />
                    <SummaryCard
                        label="Pending Fix" value={stats.corrections} color="#ea580c" icon={<AlertCircle />}
                        badge={stats.corrections > 0 ? "Fix Needed" : "None"} subLabel="Review Needed"
                        isActive={statusFilter === "Pending Fix"} onClick={() => setStatusFilter("Pending Fix")}
                    />
                </div>

                {/* Simplified Filter & Navigation Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-inner">
                            <button onClick={goToPrev} className="p-2 rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-500">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-5 py-1.5 text-[12px] font-semibold text-slate-700 bg-white shadow-sm border border-slate-200 rounded-md mx-2 hover:bg-slate-50 transition-all font-sans"
                            >
                                Today
                            </button>
                            <button onClick={goToNext} className="p-2 rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-500">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 tabular-nums">{dateLabel}</h2>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-72">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all w-full"
                            />
                        </div>
                        <div className="relative group">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer appearance-none transition-all"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem' }}
                            >
                                <option value="All">All Status</option>
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="Absent">Absent</option>
                                <option value="Offline">Offline</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Holiday">Holiday</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Department</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest">First In</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Last Out</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Work Hours</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && !refreshing ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                                                <p className="text-[13px] font-semibold text-slate-600">Syncing records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-24 text-center text-slate-400">
                                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                            <p className="text-base font-semibold text-slate-800">No records found</p>
                                            <p className="text-[13px] font-medium mt-1">Try a different filter or date range</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((record: any) => {
                                        const user = record.userDetails || record.userId;
                                        const statusCfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.Offline;
                                        return (
                                            <tr key={record._id} className="hover:bg-slate-50 transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-[12px] font-bold flex-shrink-0 border border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                                            {user?.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-[14px] font-semibold text-slate-900 leading-tight">{user?.name}</p>
                                                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">{user?.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[12px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                                                        {user?.department || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={clsx(
                                                        "text-[13px] font-semibold tabular-nums",
                                                        record.clockInTime ? "text-emerald-600" : "text-slate-300"
                                                    )}>
                                                        {record.clockInTime ? moment(record.clockInTime).format('hh:mm A') : '--:--'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={clsx(
                                                        "text-[13px] font-semibold tabular-nums",
                                                        record.clockOutTime ? "text-slate-900" : "text-slate-300"
                                                    )}>
                                                        {record.clockOutTime ? moment(record.clockOutTime).format('hh:mm A') : '--:--'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[14px] font-bold text-slate-800 tabular-nums">
                                                            {record.totalHours ? `${record.totalHours.toFixed(1)}h` : '0h'}
                                                        </span>
                                                        <div className="w-12 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#408dfb] rounded-full transition-all duration-1000"
                                                                style={{ width: `${Math.min((record.totalHours || 0) / 8 * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all text-[11px] font-semibold uppercase tracking-wider", statusCfg.bg, "border-white/50 shadow-sm", statusCfg.text)}>
                                                        <div className={clsx("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                                        {statusCfg.label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {record.correctionRequested && record.correctionDetails?.status === 'Pending' ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRecord(record);
                                                                setShowCorrectionModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-md tracking-wider hover:bg-amber-600 transition-all shadow-sm"
                                                        >
                                                            Fix Needed
                                                        </button>
                                                    ) : (
                                                        <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Correction Modal */}
            {showCorrectionModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Correction Request
                            </h3>
                            <button
                                onClick={() => setShowCorrectionModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-slate-900 rounded-lg flex items-center justify-center text-lg font-bold text-white">
                                    {selectedRecord.userId?.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-[15px] font-bold text-slate-900">{selectedRecord.userId?.name}</p>
                                    <p className="text-[12px] font-medium text-slate-400">{selectedRecord.userId?.role || 'Team Member'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Requested In</p>
                                    <p className="text-lg font-bold text-emerald-600">
                                        {selectedRecord.correctionDetails?.requestedTimeIn ? moment(selectedRecord.correctionDetails.requestedTimeIn).format('hh:mm A') : '--:--'}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Requested Out</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {selectedRecord.correctionDetails?.requestedTimeOut ? moment(selectedRecord.correctionDetails.requestedTimeOut).format('hh:mm A') : '--:--'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</p>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-[14px] text-slate-600 font-medium leading-relaxed italic">
                                    "{selectedRecord.correctionDetails?.reason || 'No detailed reason provided.'}"
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => handleCorrectionAction('rejectCorrection')}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-lg text-[13px] font-bold hover:bg-white hover:text-rose-600 hover:border-rose-200 transition-all"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleCorrectionAction('approveCorrection')}
                                disabled={actionLoading}
                                className="flex-[2] py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-bold hover:bg-blue-700 transition-all shadow-md brand-shadow"
                            >
                                {actionLoading ? 'Processing...' : 'Approve Fix'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({
    label, value, color, icon, badge, subLabel, isActive, onClick
}: {
    label: string; value: string | number; color: string; icon: React.ReactElement;
    badge?: string; subLabel?: string; isActive?: boolean; onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "group bg-white p-5 rounded-xl border transition-all duration-300 text-left w-full",
                isActive
                    ? "border-blue-600 shadow-md ring-1 ring-blue-600/10"
                    : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
            )}
        >
            <div className="flex items-center justify-between mb-6">
                <div
                    className={clsx(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                        isActive ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 group-hover:bg-slate-100"
                    )}
                    style={!isActive ? { color } : {}}
                >
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
                </div>
                {badge && (
                    <div className={clsx(
                        "px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors",
                        isActive ? "bg-blue-600/10 border-blue-600/20 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-500"
                    )}>
                        {badge}
                    </div>
                )}
            </div>

            <div>
                <h3 className={clsx(
                    "text-2xl font-bold tracking-tight tabular-nums mb-1 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-900"
                )}>
                    {value}
                </h3>
                <div className="flex flex-col">
                    <p className={clsx(
                        "text-[12px] font-semibold transition-colors",
                        isActive ? "text-blue-600/80" : "text-slate-600"
                    )}>{label}</p>
                    {subLabel && <p className="text-[11px] font-medium text-slate-400 mt-0.5">{subLabel}</p>}
                </div>
            </div>
        </button>
    );
}

import React from "react";

function Loader2({ className }: { className?: string }) {
    return <RefreshCw className={clsx("animate-spin", className)} />;
}
