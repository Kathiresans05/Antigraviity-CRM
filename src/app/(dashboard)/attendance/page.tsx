"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    Clock, Play, Square, CheckCircle, XCircle, Coffee, CalendarX,
    Calendar as CalendarIcon, Download, Printer, Filter,
    MoreVertical, ArrowUpRight, ArrowDownRight, UserCheck,
    UserX, UserMinus, Timer, TrendingUp, ChevronLeft, ChevronRight, BarChart2, Activity,
    Umbrella, Zap, Flame, LogOut as LogOutIcon, AlertTriangle
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

const STATUS_CONFIG: Record<string, { label: string, bg: string, text: string, dot: string }> = {
    Present: { label: 'Full Day', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Late: { label: 'Late Arrival', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    'Half Day': { label: 'Half Day', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    Absent: { label: 'Absent', bg: 'bg-slate-50', text: 'text-slate-400', dot: 'bg-slate-300' },
    'On Leave': { label: 'On Leave', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    Holiday: { label: 'Holiday', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    'Early Logout': { label: 'Early Logout', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' }
};

export default function AttendancePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [workingHours, setWorkingHours] = useState("00:00:00");
    const [breakHours, setBreakHours] = useState("00:00:00");
    const [clockInTime, setClockInTime] = useState<Date | null>(null);
    const [breakMinutes, setBreakMinutes] = useState(0);
    const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
    const [liveBreakMins, setLiveBreakMins] = useState(0);
    const [records, setRecords] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [unclosedSession, setUnclosedSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [dashboardStats, setDashboardStats] = useState<any>({});
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<any>(null);
    const [correctionReason, setCorrectionReason] = useState("");
    const [correctionTimeIn, setCorrectionTimeIn] = useState("");
    const [correctionTimeOut, setCorrectionTimeOut] = useState("");

    // Live clock
    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const personalRecords = records.filter(r =>
        (r.userId?._id === session?.user?.id || r.userId === session?.user?.id)
    );

    // Personal Today's record
    const todayRec = personalRecords.find((r: any) =>
        new Date(r.date).toDateString() === new Date().toDateString()
    );

    // Personal month records
    const monthRecords = personalRecords.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    // Parse "HH:MM:SS" → decimal hours for live progress while clocked in
    const parseHHMMSS = (hms: string) => {
        if (!hms || hms.includes("NaN")) return 0;
        const parts = hms.split(":");
        if (parts.length !== 3) return 0;
        const [h, m, s] = parts.map(Number);
        if (isNaN(h) || isNaN(m) || isNaN(s)) return 0;
        return h + m / 60 + s / 3600;
    };
    const todayBreakMins = isClockedIn ? (breakMinutes + liveBreakMins) : (todayRec?.breakMinutes ?? 0);
    const liveHoursValue = isClockedIn && !todayRec?.clockOutTime ? parseHHMMSS(workingHours) : null;
    const todayNetHours = liveHoursValue !== null ? liveHoursValue : (todayRec?.totalHours ?? 0);
    const safeTodayNetHours = isNaN(todayNetHours) ? 0 : todayNetHours;

    const processedRecords = monthRecords.map(r => {
        const isToday = new Date(r.date).toDateString() === new Date().toDateString();
        const hours = (isToday && isClockedIn) ? todayNetHours : (r.totalHours || 0);
        const hasClockedOut = !!r.clockOutTime;

        let effectiveStatus = r.status;

        // Only apply hour-based overrides if they've clocked out (or it's a past day)
        if (hasClockedOut && r.status !== 'On Leave' && r.status !== 'Holiday') {
            if (hours < 5) {
                effectiveStatus = 'Absent';
            } else if (hours < 7) {
                effectiveStatus = 'Half Day';
            } else if (hours < 8) {
                effectiveStatus = 'Early Logout';
            }
        }

        return { ...r, effectiveStatus, effectiveHours: hours };
    }).filter(r => {
        if (!statusFilter) return true;
        if (statusFilter === 'Missed Punch') return r.autoClosed || r.status === 'Auto Closed';
        if (statusFilter === 'Early Exit') return r.status === 'Early Logout';
        return r.effectiveStatus === statusFilter;
    });

    // Use the fetched stats from the server for KPI cards if available, else fallback to client calculations
    const stats = {
        present: processedRecords.filter(r => r.effectiveStatus === 'Present' || r.effectiveStatus === 'Late' || r.effectiveStatus === 'Early Logout').length,
        absent: processedRecords.filter(r => r.effectiveStatus === 'Absent').length,
        leave: processedRecords.filter(r => r.effectiveStatus === 'On Leave').length,
        halfDay: processedRecords.filter(r => r.effectiveStatus === 'Half Day').length,
        lateIn: processedRecords.filter(r => r.status === 'Late').length,
        autoClosed: processedRecords.filter(r => r.autoClosed).length,
        totalHours: processedRecords.reduce((acc, r) => acc + (r.effectiveHours || 0), 0),
        attendancePct: 0
    };

    // Weighted attendance calculation (Half Day = 0.5)
    const totalPossibleDays = processedRecords.length;
    const weightedPresent = stats.present + (stats.halfDay * 0.5);
    stats.attendancePct = totalPossibleDays > 0 ? (weightedPresent / totalPossibleDays) * 100 : 0;
    const REQUIRED_HOURS = 8;
    const progressPct = Math.min((todayNetHours / REQUIRED_HOURS) * 100, 100);
    const hoursLeft = Math.max(REQUIRED_HOURS - todayNetHours, 0);

    // Calculate Weekly Efficiency Data
    const generateWeeklyData = () => {
        const labels: string[] = [];
        const data: number[] = [];
        const today = new Date();

        // Loop backwards from 6 days ago up to today
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toDateString();

            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

            // Find record for this specific day
            const record = records.find(r => new Date(r.date).toDateString() === dateStr);

            if (record || i === 0) {
                // Determine hours worked for this day (use live tracking for today if clocked in)
                let hours = record?.totalHours || 0;
                if (i === 0 && isClockedIn && !record?.clockOutTime) {
                    hours = todayNetHours; // Use live hours for today
                }

                // Calculate efficiency percentage (cap at 100%)
                const efficiency = Math.min((hours / REQUIRED_HOURS) * 100, 100);
                data.push(Math.round(efficiency));
            } else {
                // If it's a past day with no record, efficiency is 0
                data.push(0);
            }
        }

        return { labels, data };
    };

    const weeklyData = generateWeeklyData();
    const weeklyAvgEfficiency = weeklyData.data.reduce((a, b) => a + b, 0) / 7;

    // Calculate Monthly Hours Data
    const generateMonthlyData = () => {
        const daysInSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const labels = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);
        const data = labels.map(day => {
            const dateStr = new Date(selectedYear, selectedMonth, day).toDateString();
            const record = monthRecords.find(r => new Date(r.date).toDateString() === dateStr);

            // If the selected day is today, use live tracking hours
            if (new Date().toDateString() === dateStr && isClockedIn && !todayRec?.clockOutTime) {
                return parseFloat(todayNetHours.toFixed(2));
            }

            return record?.totalHours || 0;
        });
        return { labels, data };
    };

    const monthlyDataObj = generateMonthlyData();


    // Checkout Modal State
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [workStatus, setWorkStatus] = useState("");
    const [fileData, setFileData] = useState<{ name: string, data: string } | null>(null);

    // Live timers (Both work and break)
    useEffect(() => {
        if (!isClockedIn || !clockInTime) return;
        const tick = () => {
            if (!clockInTime) return;
            const now = Date.now();
            const clockInMs = new Date(clockInTime).getTime();
            if (isNaN(clockInMs)) return;

            const grossMs = now - clockInMs;
            const finishedBreakMs = (breakMinutes || 0) * 60000;

            let runningBreakMs = 0;
            if (isOnBreak && breakStartTime) {
                const breakStartMs = new Date(breakStartTime).getTime();
                if (!isNaN(breakStartMs)) {
                    runningBreakMs = now - breakStartMs;
                }
            }

            // Calculate Net Work Time
            const netMs = Math.max(grossMs - finishedBreakMs - runningBreakMs, 0);
            if (!isNaN(netMs)) {
                const netSec = Math.floor(netMs / 1000);
                const h = Math.floor(netSec / 3600).toString().padStart(2, "0");
                const m = Math.floor((netSec % 3600) / 60).toString().padStart(2, "0");
                const s = (netSec % 60).toString().padStart(2, "0");
                setWorkingHours(`${h}:${m}:${s}`);
            }

            // Calculate Real-time Break Time (Accumulated + Running)
            const totalBreakMs = finishedBreakMs + runningBreakMs;
            if (!isNaN(totalBreakMs)) {
                const totalSec = Math.floor(totalBreakMs / 1000);
                const bh = Math.floor(totalSec / 3600).toString().padStart(2, "0");
                const bm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
                const bs = (totalSec % 60).toString().padStart(2, "0");
                setBreakHours(`${bh}:${bm}:${bs}`);
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isClockedIn, clockInTime, breakMinutes, isOnBreak, breakStartTime]);
    // Live break timer (ticks while on break)
    useEffect(() => {
        if (!isOnBreak || !breakStartTime) {
            setLiveBreakMins(0);
            return;
        }
        const tick = () => {
            const mins = Math.floor((Date.now() - new Date(breakStartTime).getTime()) / 60000);
            setLiveBreakMins(mins);
        };
        tick();
        const id = setInterval(tick, 10000); // update every 10s
        return () => clearInterval(id);
    }, [isOnBreak, breakStartTime]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchRecords();
            // Force sync with client local time on mount to avoid SSR hydration mismatch
            // Since this page might use a 'selectedDate' moment object if it has a calendar
            // I'll ensure any such state is updated if it exists.
        }
    }, [session?.user?.id]);

    const fetchRecords = async () => {
        try {
            const res = await axios.get("/api/attendance");
            setRecords(res.data.records);

            if (res.data.unclosedSession) {
                setUnclosedSession(res.data.unclosedSession);
            }
            if (res.data.stats) {
                setDashboardStats(res.data.stats);
            }

            // Basic check if currently clocked in for today
            const todayRecord = res.data.records.find((r: any) =>
                new Date(r.date).toDateString() === new Date().toDateString() &&
                !r.clockOutTime &&
                r.status !== 'Absent' && r.status !== 'Auto Closed' && r.status !== 'On Leave' &&
                (r.userId?._id === session?.user?.id || r.userId === session?.user?.id)
            );

            if (todayRecord) {
                setIsClockedIn(true);
                setIsOnBreak(!!todayRecord.isOnBreak);
                setBreakMinutes(todayRecord.breakMinutes || 0);
                setClockInTime(new Date(todayRecord.clockInTime));
                if (todayRecord.isOnBreak && todayRecord.breakStartTime) {
                    setBreakStartTime(new Date(todayRecord.breakStartTime));
                } else {
                    setBreakStartTime(null);
                }

                // 6:00 PM Warning Logic
                const now = new Date();
                if (now.getHours() >= 18 && !todayRecord.clockOutTime) {
                    toast.error("Reminder: Please remember to Clock Out before you leave!", {
                        duration: 6000,
                        icon: '⚠️'
                    });
                }
            } else {
                setIsClockedIn(false);
                setIsOnBreak(false);
                setClockInTime(null);
                setWorkingHours("00:00:00");
            }

        } catch (error) {
            console.error("Failed to fetch records", error);
        }
    };

    const handleClockIn = async () => {
        setLoading(true);
        try {
            await axios.post("/api/attendance", { action: "clockIn" });
            setIsClockedIn(true);
            fetchRecords();
        } catch (error) {
            alert("Error clocking in or already clocked in.");
        }
        setLoading(false);
    };

    const handleStartBreak = async () => {
        setLoading(true);
        try {
            const res = await axios.post("/api/attendance", { action: "startBreak" });
            setIsOnBreak(true);
            setBreakStartTime(new Date());
            setLiveBreakMins(0);
        } catch {
            alert("Failed to start break.");
        }
        setLoading(false);
    };

    const handleEndBreak = async () => {
        setLoading(true);
        try {
            const res = await axios.post("/api/attendance", { action: "endBreak" });
            setIsOnBreak(false);
            setBreakStartTime(null);
            setLiveBreakMins(0);
            setBreakMinutes(res.data.record?.breakMinutes || 0);
            fetchRecords();
        } catch {
            alert("Failed to end break.");
        }
        setLoading(false);
    };

    const handleClockOutClick = () => {
        setShowCheckoutModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File is too large, please select a file under 5MB.");
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFileData({ name: file.name, data: reader.result as string });
            };
            reader.readAsDataURL(file);
        } else {
            setFileData(null);
        }
    };

    const confirmClockOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workStatus.trim()) {
            alert("Please enter your work status before checking out.");
            return;
        }

        setLoading(true);
        try {
            await axios.post("/api/attendance", { action: "clockOut", workStatus, workStatusFile: fileData?.data });
            setIsClockedIn(false);
            setShowCheckoutModal(false);
            setWorkStatus("");
            setFileData(null);
            fetchRecords();
        } catch (error) {
            alert("Error clocking out. Please try again.");
        }
        setLoading(false);
    };

    const handleExport = () => {
        alert("Preparing your Attendance Export... Your report will be downloaded shortly.");
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] -m-6 p-8">
            <div className="max-w-[1500px] mx-auto space-y-8">
                {/* Clean Integrated Header - Zoho Style */}
                <div className="bg-white rounded-xl px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm border border-gray-100">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span
                                onClick={() => {
                                    const isLeader = ['Admin', 'Manager', 'TL', 'HR', 'HR Manager', 'Assigned Manager'].includes(session?.user?.role as string);
                                    router.push(isLeader ? "/team-attendance" : "/attendance");
                                }}
                                className="text-[10px] text-gray-400 font-bold uppercase tracking-wider hover:text-gray-600 cursor-pointer transition-colors"
                            >
                                Attendance
                            </span>
                            <span className="text-gray-300">/</span>
                            <span
                                className="text-[10px] text-gray-900 font-bold uppercase tracking-wider cursor-default"
                            >
                                My Overview
                            </span>
                        </div>

                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-[#1F6F8B] rounded-xl flex items-center justify-center shadow-md shadow-gray-100">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Personal Attendance</h1>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs font-semibold text-gray-400">
                                        {mounted ? currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ""}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {isClockedIn ? (
                            <div className="flex items-center gap-6 bg-gray-50 p-3 pr-6 rounded-2xl border border-gray-100 shadow-inner">
                                <div className="flex flex-col items-end pl-4 border-r border-gray-200 pr-6 min-w-[140px]">
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider transition-colors duration-300",
                                        isOnBreak ? "text-amber-500" : "text-gray-400"
                                    )}>
                                        {isOnBreak ? "On Break" : "Work Time Today"}
                                    </span>
                                    <span className={cn(
                                        "text-2xl font-bold tabular-nums mt-0.5 leading-none tracking-tight transition-colors duration-300",
                                        isOnBreak ? "text-amber-500" : "text-gray-900"
                                    )}>
                                        {mounted ? (isOnBreak ? breakHours : workingHours) : "00:00:00"}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    {!isOnBreak ? (
                                        <button
                                            onClick={handleStartBreak}
                                            disabled={loading}
                                            className="px-6 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 transition-all shadow-sm"
                                        >
                                            <Coffee className="w-3.5 h-3.5 mr-2 inline" />
                                            Take Break
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleEndBreak}
                                            disabled={loading}
                                            className="px-6 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 transition-all shadow-md shadow-amber-50 animate-pulse"
                                        >
                                            <Coffee className="w-3.5 h-3.5 mr-2 inline" />
                                            Active
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClockOutClick}
                                        disabled={loading}
                                        className="px-6 py-3 bg-[#1F6F8B] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-[#16556b] transition-all shadow-md shadow-gray-100"
                                    >
                                        Clock Out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleClockIn}
                                disabled={loading}
                                className="px-10 py-3.5 bg-[#1F6F8B] text-white rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-[#16556b] transition-all shadow-lg shadow-gray-200 flex items-center gap-3"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Clock In Now
                            </button>
                        )}
                    </div>
                </div>

                {/* Auto Closed Warning - Sleeker */}
                {unclosedSession && !showCorrectionModal && (
                    <div className="bg-orange-500 rounded-2xl p-0.5 shadow-md animate-in slide-in-from-top duration-500">
                        <div className="bg-white rounded-[14px] p-5 flex flex-col md:flex-row gap-5 items-center justify-between">
                            <div className="flex gap-4 px-2">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-100">
                                    <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Missing Checkout</h3>
                                    <p className="text-xs font-medium text-gray-500 mt-0.5 max-w-xl">
                                        You didn't clock out on <span className="text-gray-900 font-bold">{new Date(unclosedSession.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>. Update your time or auto-close to continue.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 pr-2">
                                <button
                                    onClick={() => { setSelectedRecordForCorrection(unclosedSession); setShowCorrectionModal(true); }}
                                    className="px-5 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    Time Fix
                                </button>
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            await axios.post("/api/attendance/action", { action: "autoClose", recordId: unclosedSession._id });
                                            toast.success("Successfully applied auto-closure");
                                            setUnclosedSession(null);
                                            fetchRecords();
                                        } catch (err: any) {
                                            toast.error(err.response?.data?.error || "Failed application");
                                        } finally { setLoading(false); }
                                    }}
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-[#1F6F8B] text-white rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-[#16556b] transition-all shadow-md shadow-gray-100 flex items-center gap-2"
                                >
                                    {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    Auto Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <KPICard
                        title="Attendance" value={`${stats.attendancePct.toFixed(1)}%`} color="#1F6F8B" icon={<TrendingUp />}
                    />
                    <KPICard
                        title="Working Hours" value={`${stats.totalHours.toFixed(1)}h`} color="#059669" icon={<Timer />}
                    />
                    <KPICard
                        title="Late Arrival" value={stats.lateIn} color="#f43f5e" icon={<Timer />}
                        isActive={statusFilter === 'Late'} onClick={() => setStatusFilter(statusFilter === 'Late' ? null : 'Late')}
                    />
                    <KPICard
                        title="Leave Balance" value={dashboardStats.leaveBalance ?? 18} color="#8b5cf6" icon={<Umbrella />}
                    />
                    <KPICard
                        title="Monthly Leaves" value={dashboardStats.monthlyLeaveTaken ?? 0} color="#6366f1" icon={<CalendarX />}
                    />
                    <KPICard
                        title="Today Break" value={`${Math.round(dashboardStats.todayBreak ?? 0)}m`} color="#f59e0b" icon={<Coffee />}
                    />
                    <KPICard
                        title="Early Exits" value={dashboardStats.earlyExits ?? 0} color="#f97316" icon={<LogOutIcon />}
                        isActive={statusFilter === 'Early Exit'} onClick={() => setStatusFilter(statusFilter === 'Early Exit' ? null : 'Early Exit')}
                    />
                    <KPICard
                        title="Auto Closed" value={dashboardStats.autoClosed ?? 0} color="#64748b" icon={<Clock />}
                        isActive={statusFilter === 'Auto Closed'} onClick={() => setStatusFilter(statusFilter === 'Auto Closed' ? null : 'Auto Closed')}
                    />
                </div>

                {/* Main Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                    <BarChart2 className="w-5 h-5 text-gray-900" />
                                    Work Hours Analytics
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 ml-1">Daily productivity logs</p>
                            </div>
                            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="text-[11px] font-black uppercase tracking-widest border-none bg-transparent rounded-xl px-5 py-2.5 focus:ring-0 outline-none appearance-none cursor-pointer pr-10"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem' }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <Bar
                                data={{
                                    labels: monthlyDataObj.labels,
                                    datasets: [{
                                        label: 'Hours',
                                        data: monthlyDataObj.data,
                                        backgroundColor: '#1F6F8B',
                                        borderRadius: 8,
                                        hoverBackgroundColor: '#334155',
                                        barThickness: 16
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1F6F8B', padding: 12, titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 13 }, displayColors: false } },
                                    scales: {
                                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8', padding: 10 } },
                                        x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#c1c1c1', padding: 10 } }
                                    }
                                }}
                            />
                        </div>
                    </div>


                    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2 mb-8">
                            <TrendingUp className="w-5 h-5 text-gray-900" />
                            Efficiency
                        </h3>
                        <div className="flex-1 flex flex-col justify-center gap-12">
                            <div className="relative w-48 h-48 mx-auto">
                                <Doughnut
                                    data={{
                                        datasets: [{
                                            data: [weeklyAvgEfficiency, 100 - weeklyAvgEfficiency],
                                            backgroundColor: ['#1F6F8B', '#f1f5f9'],
                                            borderWidth: 0,
                                            circumference: 270,
                                            rotation: 225,
                                            cutout: '85%',
                                            borderRadius: 20
                                        }]
                                    } as any}
                                    options={{ maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-gray-900 tracking-tight">{Math.round(weeklyAvgEfficiency)}%</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Weekly Score</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Team comparison</span>
                                        <span className="text-[10px] font-bold text-emerald-600">+4.2%</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#1F6F8B] rounded-full" style={{ width: '78%' }} />
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium text-center px-2 leading-relaxed">
                                    Your efficiency is currently in the <span className="text-gray-900 font-bold">top 15%</span> of your department. Keep it up!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* View/Log Controls - Premium Tabs */}
                <div className="bg-gray-100/50 p-1.5 rounded-xl inline-flex border border-gray-200 shadow-sm ml-1">
                    <button
                        onClick={() => setViewMode('table')}
                        className={cn(
                            "px-6 py-2 text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg",
                            viewMode === 'table' ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Detailed Log
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "px-6 py-2 text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg",
                            viewMode === 'calendar' ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Calendar View
                    </button>
                </div>

                {viewMode === 'table' ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100 uppercase">
                                        <th className="px-8 py-4 text-[9px] font-bold text-gray-400 tracking-wider">Log Date</th>
                                        <th className="px-8 py-4 text-[9px] font-bold text-gray-400 tracking-wider">Punch In</th>
                                        <th className="px-8 py-4 text-[9px] font-bold text-gray-400 tracking-wider">Punch Out</th>
                                        <th className="px-8 py-4 text-center text-[9px] font-bold text-gray-400 tracking-wider">Break</th>
                                        <th className="px-8 py-4 text-center text-[9px] font-bold text-gray-400 tracking-wider">Shift</th>
                                        <th className="px-8 py-4 text-center text-[9px] font-bold text-gray-400 tracking-wider">Status</th>
                                        <th className="px-8 py-4 text-right text-[9px] font-bold text-gray-400 tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {processedRecords.length > 0 ? processedRecords.map((record: any) => {
                                        const statusCfg = STATUS_CONFIG[record.effectiveStatus] || STATUS_CONFIG.Offline;
                                        return (
                                            <tr key={record._id} className="hover:bg-gray-50/50 transition-all group">
                                                <td className="px-8 py-4">
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-900 block leading-none">
                                                            {new Date(record.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                        </span>
                                                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-1 block">
                                                            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    {record.clockInTime ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                            <span className="text-sm font-bold text-gray-700">
                                                                {new Date(record.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-gray-200">--:--</span>}
                                                </td>
                                                <td className="px-8 py-4">
                                                    {record.clockOutTime ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                            <span className="text-sm font-bold text-gray-700">
                                                                {new Date(record.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-gray-300 font-bold text-[10px] uppercase tracking-wider">Active</span>}
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <span className="px-2 py-1 bg-gray-50 border border-gray-100 rounded text-[11px] font-semibold text-gray-500">
                                                        {Math.round(record.breakMinutes || 0)}m
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[14px] font-bold text-gray-900 tracking-tight">
                                                            {record.effectiveHours?.toFixed(1)}h
                                                        </span>
                                                        <div className="w-12 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                                            <div className="h-full bg-[#1F6F8B] transition-all duration-1000" style={{ width: `${Math.min((record.effectiveHours / 8) * 100, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white shadow-sm", statusCfg.bg)}>
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                                        <span className={cn("text-[9px] font-bold uppercase tracking-wider", statusCfg.text)}>{statusCfg.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <button className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-200 hover:text-slate-900 hover:bg-slate-50 transition-all">
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={7} className="px-10 py-32 text-center text-slate-300">
                                                <Activity className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                                <p className="text-lg font-black text-slate-900">No logs for this period</p>
                                                <p className="text-sm font-medium mt-1">Select a different month to view history</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <AttendanceCalendar
                        records={personalRecords}

                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        isClockedIn={isClockedIn}
                        todayNetHours={todayNetHours}
                    />
                )
                }


                {/* Checkout Work Status Modal */}
                {showCheckoutModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F6F8B]/60 backdrop-blur-md p-6">
                        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20 brand-shadow">
                            <div className="flex items-center justify-between p-10 pb-6">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Daily Work Summary</h3>
                                <button onClick={() => setShowCheckoutModal(false)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={confirmClockOut} className="p-10 pt-0 space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">What did you achieve today?</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Describe your progress, tickets resolved, or key milestones..."
                                        value={workStatus}
                                        required
                                        onChange={(e) => setWorkStatus(e.target.value)}
                                        className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[28px] text-[14px] font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:bg-white focus:border-blue-600/30 transition-all resize-none shadow-inner"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Attachments (Optional)</label>
                                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-[24px] border border-slate-100">
                                        <label className="cursor-pointer px-6 py-2.5 bg-[#1F6F8B] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1e293b] transition-all shrink-0">
                                            Choose File
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="text-[12px] font-medium text-slate-400 truncate pr-4">
                                            {fileData ? fileData.name : "No file chosen"}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCheckoutModal(false)}
                                        className="flex-1 py-5 text-[12px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 rounded-[24px] hover:bg-slate-100 hover:text-slate-600 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-5 text-[12px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-[24px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50 brand-shadow"
                                    >
                                        {loading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Complete Clock Out
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Correction Request Modal */}
                {showCorrectionModal && selectedRecordForCorrection && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F6F8B]/60 backdrop-blur-md p-6">
                        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20">
                            <div className="flex items-center justify-between p-10 pb-6">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Time Correction</h3>
                                <button onClick={() => { setShowCorrectionModal(false); setSelectedRecordForCorrection(null); }} className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!correctionReason.trim()) return toast.error("Reason is required");
                                    setLoading(true);
                                    try {
                                        await axios.post("/api/attendance/action", {
                                            action: "requestCorrection",
                                            recordId: selectedRecordForCorrection._id,
                                            reason: correctionReason,
                                            requestedTimeIn: correctionTimeIn ? new Date(`${new Date(selectedRecordForCorrection.date).toDateString()} ${correctionTimeIn}`).toISOString() : null,
                                            requestedTimeOut: correctionTimeOut ? new Date(`${new Date(selectedRecordForCorrection.date).toDateString()} ${correctionTimeOut}`).toISOString() : null,
                                        });
                                        toast.success("Successfully sent for HR approval");
                                        setShowCorrectionModal(false);
                                        setSelectedRecordForCorrection(null);
                                        setCorrectionReason("");
                                        setCorrectionTimeIn("");
                                        setCorrectionTimeOut("");
                                        fetchRecords();
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.error || "Failed request");
                                    } finally { setLoading(false); }
                                }}
                                className="p-10 pt-0 space-y-8"
                            >
                                <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Date</span>
                                    <span className="text-[16px] font-black text-slate-900">
                                        {new Date(selectedRecordForCorrection.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Arrival Time</label>
                                        <input
                                            type="time"
                                            value={correctionTimeIn}
                                            onChange={(e) => setCorrectionTimeIn(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] text-[14px] font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Departure Time</label>
                                        <input
                                            type="time"
                                            value={correctionTimeOut}
                                            onChange={(e) => setCorrectionTimeOut(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] text-[14px] font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Justification</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Briefly explain the reason for this correction..."
                                        value={correctionReason}
                                        onChange={(e) => setCorrectionReason(e.target.value)}
                                        className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[28px] text-[14px] font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white focus:border-slate-200 transition-all resize-none shadow-inner"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 text-[13px] font-black uppercase tracking-[0.2em] text-white bg-[#1F6F8B] rounded-[24px] hover:bg-[#1e293b] transition-all shadow-2xl shadow-slate-200 disabled:opacity-50"
                                >
                                    {loading ? "Processing Application..." : "Send to HR for Review"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, color, isActive, onClick }: { title: string; value: string | number; icon: React.ReactNode; color: string; isActive?: boolean; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-white p-5 rounded-xl border transition-colors duration-200 relative overflow-hidden cursor-pointer",
                isActive ? "border-slate-900 bg-slate-50/50 shadow-sm ring-1 ring-slate-900" : "border-gray-100 shadow-sm",
                !onClick && "cursor-default"
            )}
        >
            <div className="flex items-center gap-5">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: `${color}08`, color }}
                >
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
                </div>
                <div className="min-w-0 flex-1">
                    <h3
                        className="text-2xl font-bold tracking-tight tabular-nums truncate leading-none mb-1.5"
                        style={{ color }}
                    >
                        {value}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
                </div>
            </div>

            {isActive && (
                <div className="absolute top-0 right-0 p-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#1F6F8B]" />
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Absent;
    return (
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white shadow-sm", cfg.bg)}>
            <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
            <span className={cn("text-[10px] font-black uppercase tracking-widest", cfg.text)}>{cfg.label}</span>
        </div>
    );
}

function AttendanceCalendar({ records, selectedMonth, selectedYear, isClockedIn, todayNetHours }: any) {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const today = new Date();

    const getStatusConfig = (day: number) => {
        const d = new Date(selectedYear, selectedMonth, day);
        const dateStr = d.toDateString();
        const isToday = dateStr === today.toDateString();
        const record = records.find((r: any) => new Date(r.date).toDateString() === dateStr);

        if (!record) return { color: 'text-slate-400', bg: 'bg-white', label: '', isToday, statusLabel: '' };

        const hours = (isToday && isClockedIn) ? todayNetHours : (record.totalHours || 0);
        const hasClockedOut = !!record.clockOutTime;
        let effectiveStatus = record.status;

        if (hasClockedOut && record.status !== 'On Leave' && record.status !== 'Holiday') {
            if (hours < 5) {
                effectiveStatus = 'Absent';
            } else if (hours < 7) {
                effectiveStatus = 'Half Day';
            } else if (hours < 8) {
                effectiveStatus = 'Early Logout';
            }
        }
        const statusLabel = (effectiveStatus === 'Present' || effectiveStatus === 'Late') ? 'Full Day' : effectiveStatus;

        switch (effectiveStatus) {
            case 'Present': return { color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50', isToday, statusLabel };
            case 'Late': return { color: 'text-rose-700', dot: 'bg-rose-500', bg: 'bg-rose-50', isToday, statusLabel };
            case 'Early Logout': return { color: 'text-orange-700', dot: 'bg-orange-500', bg: 'bg-orange-50', isToday, statusLabel };
            case 'Half Day': return { color: 'text-amber-700', dot: 'bg-amber-500', bg: 'bg-amber-50', isToday, statusLabel };
            case 'On Leave': return { color: 'text-violet-700', dot: 'bg-violet-500', bg: 'bg-violet-50', isToday, statusLabel };
            default: return { color: 'text-slate-400', dot: '', bg: 'bg-slate-50', isToday, statusLabel };
        }
    };

    return (
        <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-12 bg-slate-50/30">
                <div className="grid grid-cols-7 gap-6 mb-10">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-6">
                    {Array(firstDayOfMonth).fill(null).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square opacity-0" />
                    ))}
                    {days.map(day => {
                        const config = getStatusConfig(day);
                        return (
                            <div key={day} className="relative aspect-square group cursor-pointer transition-all duration-300">
                                <div className={cn(
                                    "absolute inset-0 rounded-[32px] border transition-all duration-500",
                                    "bg-white shadow-sm border-white group-hover:border-slate-200 group-hover:shadow-xl group-hover:shadow-slate-200/50",
                                    config.isToday ? "border-slate-900 shadow-xl shadow-slate-100 ring-4 ring-slate-900/5" : ""
                                )} />

                                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                    <span className={cn(
                                        "text-2xl font-black transition-all",
                                        config.isToday ? "text-slate-900" : "text-slate-300 group-hover:text-slate-900"
                                    )}>
                                        {day}
                                    </span>

                                    {config.dot && (
                                        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white shadow-sm self-start scale-90 -ml-1 origin-left", config.bg)}>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                                            <span className={cn("text-[9px] font-black uppercase tracking-widest", config.color)}>
                                                {config.statusLabel}
                                            </span>
                                        </div>
                                    )}

                                    {!config.dot && config.isToday && (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-900/40">Active</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white px-10 py-6 border-t border-slate-100 flex items-center justify-center gap-10 flex-wrap">
                <LegendItem dot="bg-emerald-500" label="Full Day" />
                <LegendItem dot="bg-rose-500" label="Late In" />
                <LegendItem dot="bg-orange-500" label="Early Logout" />
                <LegendItem dot="bg-amber-500" label="Half Day" />
                <LegendItem dot="bg-violet-500" label="On Leave" />
            </div>
        </div>
    );
}

function LegendItem({ dot, label }: { dot: string; label: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className={cn("w-2 h-2 rounded-full", dot)} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {label}
            </span>
        </div>
    );
}
