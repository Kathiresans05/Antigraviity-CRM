"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Users, Mail, Phone, Briefcase, ExternalLink,
    Search, Filter, MoreHorizontal, UserCheck,
    Clock, CheckCircle, ArrowRight, Loader2, Download,
    ChevronDown, ChevronRight, User, AlertCircle, RefreshCw,
    CheckSquare, Activity, Calendar, LayoutGrid
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import clsx from "clsx";
import moment from "moment";

interface TeamMember {
    _id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    department?: string;
    isActive: boolean;
    reportingManager?: string;
    attendanceStatus?: 'Present' | 'Late' | 'Absent' | 'Offline' | 'Half Day';
    clockIn?: string;
    clockOut?: string;
    workHours?: string;
    taskProgress?: number;
}

export default function TeamOverviewPage() {
    const { data: session } = useSession();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedTls, setExpandedTls] = useState<string[]>([]);
    const managerId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    const fetchData = async () => {
        if (!managerId) return;
        setLoading(true);
        try {
            const [usersRes, attendanceRes, checklistRes] = await Promise.all([
                axios.get("/api/users"),
                axios.get("/api/attendance"),
                axios.get("/api/daily-checklist")
            ]);

            const allUsers = usersRes.data.users || [];
            const records = attendanceRes.data.records || [];
            const checklists = checklistRes.data.records || [];
            const today = moment().startOf('day');

            const enrichedUsers = allUsers.map((user: any) => {
                const record = records.find((r: any) =>
                    r.userId?._id === user._id &&
                    moment(r.date).isSame(today, 'day')
                );

                const checklist = checklists.find((c: any) => c.userId?._id === user._id);
                const completedTasks = checklist?.items?.filter((i: any) => i.completed).length || 0;
                const totalTasks = checklist?.items?.length || 8;
                const progress = Math.round((completedTasks / totalTasks) * 100);

                let status: any = 'Offline';
                let clockIn = "--:--";
                let clockOut = "--:--";
                let workHours = "0h 0m";

                if (record) {
                    status = record.status;
                    clockIn = record.clockInTime ? moment(record.clockInTime).format("hh:mm A") : "--:--";
                    clockOut = record.clockOutTime ? moment(record.clockOutTime).format("hh:mm A") : "--:--";
                    if (record.totalHours) {
                        const h = Math.floor(record.totalHours);
                        const m = Math.round((record.totalHours - h) * 60);
                        workHours = `${h}h ${m}m`;
                    }
                } else if (user.isActive && moment().hour() >= 10) {
                    status = 'Absent';
                }

                return {
                    ...user,
                    attendanceStatus: status,
                    clockIn,
                    clockOut,
                    workHours,
                    taskProgress: progress
                };
            });

            setTeam(enrichedUsers);
        } catch (err) {
            console.error("Failed to fetch team data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [managerId]);

    const toggleExpand = (id: string) => {
        setExpandedTls(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const isHRAdmin = ["Admin", "HR", "HR Manager"].includes(userRole);

    const directReports = team.filter(u =>
        (u.reportingManager && String(u.reportingManager) === String(managerId)) ||
        (isHRAdmin && !u.reportingManager)
    );

    const getSubordinates = (tlId: string) => team.filter(u =>
        u.reportingManager && String(u.reportingManager) === String(tlId)
    );

    const StatusBadge = ({ status }: { status?: string }) => {
        const colors = {
            Present: "bg-emerald-100 text-emerald-700",
            Late: "bg-amber-100 text-amber-700",
            'Half Day': "bg-orange-100 text-orange-700",
            Absent: "bg-rose-100 text-rose-700",
            Offline: "bg-gray-100 text-gray-500"
        }[status || 'Offline'] || "bg-gray-100 text-gray-500";

        return (
            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide", colors)}>
                {status || 'Offline'}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading organization structure...</p>
            </div>
        );
    }

    const filteredTeam = team.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans text-slate-800">
            {/* KPI Header section - Zoho Style Top Position */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Managed", value: team.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Present", value: team.filter(u => u.attendanceStatus === 'Present').length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Absent", value: team.filter(u => u.attendanceStatus === 'Absent').length, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Work Progress", value: `${Math.round(team.reduce((acc, current) => acc + (current.taskProgress || 0), 0) / (team.length || 1))}%`, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg)}>
                                <stat.icon className={clsx("w-5 h-5", stat.color)} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-xl font-black text-slate-900">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Monitoring Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-blue-600" /> Team Hierarchy
                    </h2>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
                        />
                    </div>
                    <button onClick={fetchData} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 transition-all">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* High Density Table Body */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4 w-12 text-center"></th>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Timing (In/Out)</th>
                            <th className="px-6 py-4">Total Hrs</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4">Work Progress</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {directReports.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-900">No Teams assigned to you</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                                        Use the <Link href="/manage-teams" className="text-blue-600 font-bold hover:underline">Manage Teams</Link> menu to assign members to your reporting line.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            directReports.map(tl => {
                                const subordinates = getSubordinates(tl._id);
                                const isExpanded = expandedTls.includes(tl._id);
                                const isTL = subordinates.length > 0;

                                return (
                                    <>
                                        <tr key={tl._id} className={clsx("group transition-colors", isExpanded ? "bg-blue-50/20" : "hover:bg-slate-50/50")}>
                                            <td className="px-6 py-4 text-center">
                                                {isTL && (
                                                    <button onClick={() => toggleExpand(tl._id)} className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-all">
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-[#1e293b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                                        {tl.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 leading-tight">{tl.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-500 uppercase">{tl.department || "No Dept"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-emerald-600">{tl.clockIn}</span>
                                                    <span className="text-[11px] font-bold text-slate-400">{tl.clockOut}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-slate-700">{tl.workHours}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={tl.attendanceStatus} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-full max-w-[120px] space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                        <span>{tl.taskProgress}%</span>
                                                        <span>Today</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx("h-full transition-all", tl.taskProgress! >= 80 ? "bg-emerald-500" : "bg-blue-600")}
                                                            style={{ width: `${tl.taskProgress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/employees/${tl._id}`} className="text-[11px] font-black text-blue-600 uppercase tracking-wider hover:underline">
                                                    View Profile
                                                </Link>
                                            </td>
                                        </tr>

                                        {/* Nested Indirect Reports */}
                                        {isExpanded && subordinates.map(sub => (
                                            <tr key={sub._id} className="bg-white border-l-4 border-blue-600/30">
                                                <td className="px-6 py-3"></td>
                                                <td className="px-6 py-3 pl-10">
                                                    <div className="flex items-center gap-3 opacity-80">
                                                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                            {sub.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-bold text-slate-700 leading-tight">{sub.name}</p>
                                                            <p className="text-[10px] font-medium text-slate-400 uppercase">{sub.role}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col opacity-80">
                                                        <span className="text-[12px] font-bold text-emerald-600">{sub.clockIn}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="text-[13px] font-black text-slate-600">{sub.workHours}</span>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <StatusBadge status={sub.attendanceStatus} />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="w-full max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-400 transition-all"
                                                            style={{ width: `${sub.taskProgress}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <Link href={`/employees/${sub._id}`} className="text-[10px] font-black text-slate-400 uppercase hover:text-blue-600">
                                                        Details
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend / Footer info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-6 items-center justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">On Time</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Late Check-in</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Weekend / Off</span>
                </div>
            </div>
        </div>
    );
}
