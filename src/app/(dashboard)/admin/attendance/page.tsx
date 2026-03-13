"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
    Users, UserCheck, UserX, Calendar as CalendarIcon,
    Search, Download, Clock, ChevronLeft, ChevronRight,
    AlertCircle, RefreshCw, MoreHorizontal, ChevronDown, 
    Filter, FileText, CheckCircle2, User
} from "lucide-react";
import { toast } from "react-hot-toast";
import moment from "moment";
import clsx from "clsx";

/* ─── Status Config ────────────────────────────────── */
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    Present: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Present" },
    FULL_DAY: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Full Day" },
    Late: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Late" },
    'Half Day': { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Half Day" },
    HALF_DAY: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Half Day" },
    'Early Logout': { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", label: "Early Logout" },
    Absent: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Absent" },
    ABSENT: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Absent" },
    'On Leave': { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", label: "On Leave" },
    'Auto Closed': { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400", label: "Auto Closed" },
    'Holiday': { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", label: "Holiday" },
    'Offline': { bg: "bg-slate-50", text: "text-slate-400", dot: "bg-slate-300", label: "Offline" },
    'ACTIVE': { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", label: "Clocked In" },
    'Active': { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", label: "Clocked In" },
};

export default function AdminAttendancePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterType = searchParams.get('filter');

    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [shiftFilter, setShiftFilter] = useState("All");
    const [selectedDate, setSelectedDate] = useState(moment());
    const [refreshing, setRefreshing] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const url = filterType 
                ? `/api/attendance?filter=${filterType}` 
                : "/api/attendance";
            
            const res = await axios.get(url);
            setAttendanceRecords(res.data.records || []);
            
            if (filterType) {
                setSelectedDate(moment());
            }
        } catch (error) {
            console.error("Failed to fetch attendance data", error);
            toast.error("Failed to sync attendance records");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (session?.user) fetchData();
    }, [session?.user, filterType]);

    const isAdminHR = useMemo(() => {
        return ['Admin', 'HR', 'HR Manager'].includes(session?.user?.role as string);
    }, [session?.user?.role]);

    /* ─── Filtering Logic ─────────────────────────────────────── */
    const filteredRecords = useMemo(() => {
        return attendanceRecords.filter((r: any) => {
            const user = r.userId;
            if (!user) return false;

            const name = (user.name || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            const empCode = (user.employeeCode || "").toLowerCase();
            const dept = (user.department || "").toLowerCase();
            const search = searchTerm.toLowerCase();

            const matchesSearch = name.includes(search) || email.includes(search) || empCode.includes(search);
            const matchesDept = deptFilter === "All" || user.department === deptFilter;
            // Shift is mocked for now as per requirement
            const matchesShift = shiftFilter === "All" || "General Shift" === shiftFilter;

            return matchesSearch && matchesDept && matchesShift;
        });
    }, [attendanceRecords, searchTerm, deptFilter, shiftFilter]);

    // Departments for filter dropdown
    const departments = useMemo(() => {
        const depts = new Set<string>();
        attendanceRecords.forEach(r => {
            if (r.userId?.department) depts.add(r.userId.department);
        });
        return Array.from(depts);
    }, [attendanceRecords]);

    /* ─── Pagination Logic ───────────────────────────────────── */
    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

    const exportToCSV = () => {
        const headers = ["Employee Name", "Employee ID", "Department", "Shift", "Clock In", "Clock Out", "Work Hours", "Status"];
        const rows = filteredRecords.map(r => [
            r.userId?.name || "N/A",
            r.userId?.employeeCode || "N/A",
            r.userId?.department || "General",
            "General Shift (10:00 AM - 07:00 PM)",
            r.clockInTime ? moment(r.clockInTime).format('hh:mm A') : "--:--",
            r.clockOutTime ? moment(r.clockOutTime).format('hh:mm A') : "--:--",
            r.totalHours ? r.totalHours.toFixed(1) + 'h' : '0h',
            r.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_Report_${moment().format('YYYY-MM-DD')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <CalendarIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
                            <p className="text-[14px] font-medium text-slate-500 mt-1">
                                {filterType === 'present-today' ? "Showing all employees present today" : 
                                 filterType === 'late-arrival' || filterType === 'late' ? "Showing all late arrivals for today" :
                                 filterType === 'early-exit' ? "Showing all early exits for today" :
                                 filterType === 'on-time' ? "Showing all on-time check-ins for today" :
                                 filterType === 'on-break' ? "Showing all employees currently on break" :
                                 filterType === 'absent-today' ? "Showing employees who have not checked in today" :
                                 filterType === 'auto-closed' ? "Showing all auto-closed attendance records" :
                                 "View and manage staff attendance records"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                            Sync
                        </button>
                        <button 
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{filteredRecords.length}</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">Total Employees</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Present</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">
                            {filteredRecords.filter(r => r.status && STATUS_CONFIG[r.status]?.label !== 'Absent').length}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">Present Today</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Late</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">
                            {filteredRecords.filter(r => r.isLate).length}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">Late Arrivals</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                                <UserX className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Absent</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">
                            {filteredRecords.filter(r => r.status === 'Absent' || r.status === 'ABSENT').length}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">Total Absent</p>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-6">
                    <div className="relative flex-1 w-full lg:w-auto">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by name or employee ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select 
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Departments</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <select 
                                value={shiftFilter}
                                onChange={(e) => setShiftFilter(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Shifts</option>
                                <option value="General Shift">General Shift</option>
                                <option value="Night Shift">Night Shift</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                                    {filterType === 'absent-today' && <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Designation</th>}
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Shift</th>
                                    {filterType !== 'absent-today' ? (
                                        <>
                                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Clock In</th>
                                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Clock Out</th>
                                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Work Hours</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Scheduled Start</th>
                                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Check-In</th>
                                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Remark</th>
                                        </>
                                    )}
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                                                <p className="text-sm font-bold text-slate-500">Loading Attendance...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center opacity-50">
                                                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                                                <p className="text-base font-bold text-slate-900">No records found</p>
                                                <p className="text-sm font-medium text-slate-500 mt-1">Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRecords.map((record: any) => {
                                        const user = record.userId;
                                        const statusCfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.Offline;
                                        return (
                                            <tr key={record._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                                                            {user?.name?.[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 leading-tight">{user?.name}</p>
                                                            <p className="text-[11px] font-black text-blue-600 tracking-wider mt-1 uppercase">{user?.employeeCode || 'EMP-xxx'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200">
                                                        {user?.department || 'General'}
                                                    </span>
                                                </td>
                                                {filterType === 'absent-today' && (
                                                    <td className="px-6 py-5">
                                                        <span className="text-[12px] font-bold text-slate-700">
                                                            {user?.designation || 'Specialist'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-slate-800">General Shift</span>
                                                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5">10:00 AM - 07:00 PM</span>
                                                    </div>
                                                </td>
                                                {filterType !== 'absent-today' ? (
                                                    <>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className={clsx(
                                                                "text-[13px] font-bold tabular-nums",
                                                                record.clockInTime ? "text-emerald-600" : "text-slate-300"
                                                            )}>
                                                                {record.clockInTime ? moment(record.clockInTime).format('hh:mm A') : '--:--'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className={clsx(
                                                                "text-[13px] font-bold tabular-nums",
                                                                record.clockOutTime ? "text-slate-900" : "text-slate-300"
                                                            )}>
                                                                {record.clockOutTime ? moment(record.clockOutTime).format('hh:mm A') : '--:--'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className="text-[14px] font-black text-slate-800 tabular-nums">
                                                                {record.totalHours ? record.totalHours.toFixed(1) + 'h' : '0h'}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className="text-[13px] font-bold text-slate-400 tabular-nums">
                                                                10:00 AM
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className="text-[12px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded">
                                                                Missing
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="text-[11px] font-medium text-slate-500 italic">
                                                                {record.status === 'On Leave' ? 'Approved Leave' : 'No attendance record'}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-6 py-5">
                                                    <div className={clsx(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                                                        statusCfg.bg, statusCfg.text, "border-white/50 shadow-sm"
                                                    )}>
                                                        <div className={clsx("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                                        {statusCfg.label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[12px] font-bold text-slate-500">
                                Showing <span className="text-slate-900">{paginatedRecords.length}</span> of <span className="text-slate-900">{filteredRecords.length}</span> results
                            </p>
                            <div className="flex items-center gap-2">
                                <button 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={clsx(
                                                "w-8 h-8 text-[12px] font-bold rounded-lg transition-all",
                                                currentPage === i + 1 ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
