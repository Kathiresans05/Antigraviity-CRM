"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Calendar, Users, Building, Phone, Mail,
    MapPin, AlertCircle, Clock, Save, User as UserIcon, RefreshCw, Briefcase, Hash, ChevronDown,
    CheckCircle2, TrendingUp, XCircle, Timer, BarChart2, CalendarCheck, DollarSign, FileText, ShieldCheck, Key
} from "lucide-react";
import moment from "moment";

export default function EmployeeProfilePage() {
    const { id } = useParams();
    const { data: session } = useSession();
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const isAdmin = session?.user?.role === "Admin";
    const canViewStats = ["Admin", "HR", "HR Manager", "Manager", "Assigned Manager", "TL"].includes((session?.user as any)?.role);
    const canViewOtherProfiles = ["Admin", "HR", "HR Manager", "Manager", "Assigned Manager", "TL"].includes((session?.user as any)?.role);
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("personal");

    useEffect(() => {
        if (!session) return;

        // Block regular employees from viewing other employees' profiles
        const viewerId = (session.user as any)?._id || (session.user as any)?.id;
        if (!canViewOtherProfiles && viewerId && viewerId !== id) {
            router.replace("/dashboard");
            return;
        }

        fetchProfile();
        if (canViewStats) fetchStats();
    }, [id, session]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/employees/${id}`);
            if (!res.ok) throw new Error("Failed to load profile");
            const data = await res.json();
            setProfile(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const res = await fetch(`/api/employees/${id}/stats`);
            if (res.ok) setStats(await res.json());
        } catch { }
        finally { setStatsLoading(false); }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="text-center mt-10 p-6 bg-red-50 text-red-600 rounded-lg">
                <p className="font-semibold text-lg">{error || "Profile not found"}</p>
            </div>
        );
    }

    const { basicDetails, companyDetails, emergencyContact, experience, managerDetails } = profile;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">

            {/* Header Actions */}
            <div className="flex justify-between items-center px-2">
                <h1 className="text-2xl font-bold text-gray-800">Employee Profile</h1>
                {isAdmin && (
                    <button onClick={() => alert("Edit Modal Coming Soon")} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors">
                        <Save className="w-4 h-4" /> Edit Profile
                    </button>
                )}
            </div>

            {/* SECTION 1: PROFILE HEADER CARD (Teal Blue) */}
            <div className="bg-[#1F6F8B] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    {/* Avatar */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/10 rounded-full border-4 border-white/20 flex items-center justify-center text-4xl font-bold backdrop-blur-sm shrink-0">
                        {basicDetails?.avatarUrl ? (
                            <img src={basicDetails.avatarUrl} alt={basicDetails.name || "User"} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            (basicDetails?.name || "?").charAt(0).toUpperCase()
                        )}
                    </div>

                    {/* Core Info */}
                    <div className="flex-1 text-center sm:text-left space-y-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold mb-1">{basicDetails?.name || "N/A"}</h2>
                            <p className="text-blue-100 font-medium text-lg">{companyDetails?.role || "N/A"} • {companyDetails?.department || "N/A"}</p>
                        </div>

                        {/* 2-Column Desktop / Stacked Mobile Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm text-blue-50">
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <Briefcase className="w-4 h-4 opacity-70" />
                                <span>{companyDetails?.employeeCode || "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <Building className="w-4 h-4 opacity-70" />
                                <span>Antigraviity ({companyDetails?.workLocation || "N/A"})</span>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <Mail className="w-4 h-4 opacity-70" />
                                <a href={`mailto:${basicDetails?.email}`} className="hover:underline hover:text-white transition">{basicDetails?.email || "N/A"}</a>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <Users className="w-4 h-4 opacity-70" />
                                <span>Reports to: {managerDetails?.name || "None"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-wrap gap-2">
                {[
                    { id: "personal", label: "Personal Info", icon: UserIcon },
                    { id: "job", label: "Job Details", icon: Briefcase },
                    ...(canViewStats && profile.rawUser?.salaryDetails ? [{ id: "salary", label: "Salary Details", icon: DollarSign }] : []),
                    { id: "docs", label: "Documents", icon: FileText },
                    { id: "access", label: "System Access", icon: ShieldCheck }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-[#1F6F8B] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT AREAS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">

                {/* 1. PERSONAL INFO TAB */}
                {activeTab === "personal" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* SECTION 2: INFO GRID (4 small cards) */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="w-10 h-10 bg-blue-50/80 text-blue-500 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/50">
                                    <Calendar className="w-5 h-5 stroke-[1.5]" />
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Joining Date</p>
                                    <p className="font-medium text-slate-800 text-sm sm:text-base">{experience.joiningDate}</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="w-10 h-10 bg-emerald-50/80 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/50">
                                    <Clock className="w-5 h-5 stroke-[1.5]" />
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Total Service</p>
                                    <p className="font-medium text-slate-800 text-sm sm:text-base">{experience.totalService}</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="w-10 h-10 bg-rose-50/80 text-rose-500 rounded-xl flex items-center justify-center shrink-0 border border-rose-100/50">
                                    <AlertCircle className="w-5 h-5 stroke-[1.5]" />
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Emergency ({emergencyContact.name})</p>
                                    <p className="font-medium text-slate-800 text-sm sm:text-base">{emergencyContact.number}</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="w-10 h-10 bg-blue-50/80 text-blue-500 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/50">
                                    <Hash className="w-5 h-5 stroke-[1.5]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Internal ID</p>
                                    <p className="font-medium text-slate-800 text-sm sm:text-base truncate">{companyDetails.internalId}</p>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: COLLAPSIBLE SECTIONS */}
                        <div className="space-y-4">
                            {/* About Me Link Card */}
                            <div onClick={() => router.push(`/employees/${id}/about`)} className="group bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50/80 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100/50">
                                        <UserIcon className="w-5 h-5 stroke-[1.5]" />
                                    </div>
                                    <div>
                                        <h3 className="text-gray-900 font-medium tracking-tight group-hover:text-blue-600 transition-colors">About Me</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">View full personal, contact details, and approvers.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Address & Coordinates */}
                            <div className="group bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="px-5 pb-5 pt-4 grid gap-4 text-sm">
                                    <h4 className="font-bold flex gap-2"><MapPin className="w-4 h-4 text-[#1F6F8B]" /> Address</h4>
                                    <div>
                                        <p className="text-gray-800">{basicDetails?.address || "No address provided."}</p>
                                    </div>
                                    {basicDetails?.coordinates && (
                                        <div>
                                            <p className="text-gray-500 font-medium mb-1">GPS Coordinates</p>
                                            <p className="font-mono bg-gray-50 py-1 px-2 rounded inline-block text-gray-700">{basicDetails.coordinates}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. JOB DETAILS TAB */}
                {activeTab === "job" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* SECTION 4.A: JOB INFORMATION */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Employment Details</h3>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Employee ID</p>
                                    <p className="text-sm font-medium text-slate-800">{companyDetails?.employeeCode || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Department</p>
                                    <p className="text-sm font-medium text-slate-800">{companyDetails?.department || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Designation</p>
                                    <p className="text-sm font-medium text-slate-800">{profile.rawUser?.designation || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> System Role</p>
                                    <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold">{companyDetails?.role || "N/A"}</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Employment Type</p>
                                    <p className="text-sm font-medium text-slate-800">{profile.rawUser?.employmentType || "Full-time"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Reporting Manager</p>
                                    <p className="text-sm font-medium text-slate-800">{managerDetails?.name || "None"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Work Location</p>
                                    <p className="text-sm font-medium text-slate-800">{companyDetails?.workLocation || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date of Joining</p>
                                    <p className="text-sm font-medium text-slate-800">{experience?.joiningDate || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4.B: PERFORMANCE STATS — visible to TL/Manager/HR/Admin */}
                        {canViewStats && (
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Performance Overview</h3>

                                {statsLoading ? (
                                    <div className="bg-white rounded-xl border border-gray-100 p-8 flex justify-center">
                                        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                                    </div>
                                ) : stats ? (
                                    <>
                                        {/* Attendance Card */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                    <CalendarCheck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800">Attendance — This Month</h4>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        {stats.attendance.workingDays} working day{stats.attendance.workingDays !== 1 ? "s" : ""} · Avg {stats.attendance.avgHours}h/day
                                                    </p>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    <p className="text-lg font-bold text-blue-600">{stats.attendance.attendanceRate}%</p>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Attendance</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-gray-50">
                                                {[
                                                    { label: "Present", value: stats.attendance.present, color: "text-emerald-600", bg: "bg-emerald-50" },
                                                    { label: "Late", value: stats.attendance.late, color: "text-amber-600", bg: "bg-amber-50" },
                                                    { label: "Absent", value: stats.attendance.absent, color: "text-rose-600", bg: "bg-rose-50" },
                                                    { label: "Half Day", value: stats.attendance.halfDay, color: "text-purple-600", bg: "bg-purple-50" },
                                                ].map((s) => (
                                                    <div key={s.label} className="p-4 text-center">
                                                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Leave Card */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                                                <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800">Leave — This Year</h4>
                                                    <p className="text-[11px] text-slate-400 font-medium">{stats.leave.totalDays} approved days taken</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 divide-x divide-gray-50">
                                                {[
                                                    { label: "Approved", value: stats.leave.approved, color: "text-emerald-600" },
                                                    { label: "Pending", value: stats.leave.pending, color: "text-amber-600" },
                                                    { label: "Rejected", value: stats.leave.rejected, color: "text-rose-600" },
                                                ].map((s) => (
                                                    <div key={s.label} className="p-4 text-center">
                                                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {stats.leave.history?.length > 0 && (
                                                <details className="">
                                                    <summary className="px-5 py-3 border-t border-gray-50 text-[12px] font-bold text-blue-500 cursor-pointer hover:text-blue-700 flex items-center gap-1">
                                                        View Leave History
                                                    </summary>
                                                    <div className="px-5 pb-4 space-y-2">
                                                        {stats.leave.history.map((l: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center text-[12px] py-2 border-b border-gray-50 last:border-0">
                                                                <div>
                                                                    <span className="font-bold text-slate-700">{l.type}</span>
                                                                    <span className="text-slate-400 ml-2">{l.startDate} – {l.endDate}</span>
                                                                </div>
                                                                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${l.status === "Approved" ? "bg-emerald-50 text-emerald-600" :
                                                                    l.status === "Pending" ? "bg-amber-50 text-amber-600" :
                                                                        "bg-rose-50 text-rose-600"
                                                                    }`}>{l.status}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>

                                        {/* Task Performance Card */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                        <BarChart2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">Task Performance</h4>
                                                        <p className="text-[11px] text-slate-400 font-medium">{stats.tasks.completionRate}% completion rate</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-indigo-600">{stats.tasks.completionRate}%</p>
                                                </div>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="px-5 py-4 space-y-3">
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${stats.tasks.completionRate}%` }} />
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[
                                                        { label: "Done", value: stats.tasks.completed, color: "text-emerald-600" },
                                                        { label: "In Progress", value: stats.tasks.inProgress, color: "text-blue-600" },
                                                        { label: "Pending", value: stats.tasks.pending, color: "text-amber-600" },
                                                        { label: "Overdue", value: stats.tasks.overdue, color: "text-rose-600" },
                                                    ].map((s) => (
                                                        <div key={s.label} className="text-center bg-slate-50 rounded-lg p-2">
                                                            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Daily Login/Logout Log */}
                                        {stats.attendanceLog?.length > 0 && (
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                                                    <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">Daily Login / Logout Log</h4>
                                                        <p className="text-[11px] text-slate-400 font-medium">Last 30 days</p>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-[12px]">
                                                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Date</th>
                                                                <th className="px-4 py-2 text-left">Status</th>
                                                                <th className="px-4 py-2 text-left">Clock In</th>
                                                                <th className="px-4 py-2 text-left">Clock Out</th>
                                                                <th className="px-4 py-2 text-left">Hours</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {stats.attendanceLog.map((r: any, i: number) => (
                                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-4 py-2.5 font-medium text-slate-700">{r.date}</td>
                                                                    <td className="px-4 py-2.5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === "Present" ? "bg-emerald-50 text-emerald-600" :
                                                                            r.status === "Late" ? "bg-amber-50 text-amber-600" :
                                                                                r.status === "Absent" ? "bg-rose-50 text-rose-600" :
                                                                                    r.status === "Half Day" ? "bg-purple-50 text-purple-600" :
                                                                                        "bg-gray-100 text-gray-500"
                                                                            }`}>{r.status}</span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-slate-600">{r.clockIn}</td>
                                                                    <td className="px-4 py-2.5 text-slate-600">{r.clockOut}</td>
                                                                    <td className="px-4 py-2.5 font-medium text-slate-700">{r.totalHours}{r.autoClosed && <span className="ml-1 text-amber-400 text-[10px]">auto</span>}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Projects */}
                                        {stats.projects?.length > 0 && (
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                                                    <div className="w-8 h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center">
                                                        <Briefcase className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">Projects</h4>
                                                        <p className="text-[11px] text-slate-400 font-medium">{stats.projects.length} project{stats.projects.length !== 1 ? "s" : ""} assigned</p>
                                                    </div>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                    {stats.projects.map((p: any) => (
                                                        <div key={p.id} className="px-5 py-3 flex items-center gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[13px] font-bold text-slate-800 truncate">{p.name}</p>
                                                                <p className="text-[11px] text-slate-400">{p.client} · {p.startDate} → {p.endDate}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <div className="w-20">
                                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${p.progress}%` }} />
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 text-right mt-0.5">{p.progress}%</p>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === "Completed" ? "bg-emerald-50 text-emerald-600" :
                                                                    p.status === "On Hold" ? "bg-amber-50 text-amber-600" :
                                                                        "bg-blue-50 text-blue-600"
                                                                    }`}>{p.status}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Full Task List */}
                                        {stats.taskList?.length > 0 && (
                                            <details className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group" open>
                                                <summary className="[display:flex] items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-800">Task List</h4>
                                                            <p className="text-[11px] text-slate-400 font-medium">{stats.taskList.length} tasks · {stats.tasks.completionRate}% done</p>
                                                        </div>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200 shrink-0" />
                                                </summary>
                                                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                                                    {stats.taskList.map((t: any) => (
                                                        <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full shrink-0 ${t.status === "Completed" ? "bg-emerald-500" :
                                                                t.status === "In Progress" ? "bg-blue-500" :
                                                                    t.isOverdue ? "bg-rose-500" : "bg-amber-400"
                                                                }`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-[13px] font-medium truncate ${t.status === "Completed" ? "line-through text-slate-400" : "text-slate-700"}`}>{t.title}</p>
                                                                <p className="text-[11px] text-slate-400">{t.project} · Due {t.due}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.priority === "High" ? "bg-rose-50 text-rose-600" :
                                                                    t.priority === "Low" ? "bg-slate-100 text-slate-500" :
                                                                        "bg-amber-50 text-amber-600"
                                                                    }`}>{t.priority}</span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === "Completed" ? "bg-emerald-50 text-emerald-600" :
                                                                    t.status === "In Progress" ? "bg-blue-50 text-blue-600" :
                                                                        t.isOverdue ? "bg-rose-50 text-rose-600" :
                                                                            "bg-amber-50 text-amber-600"
                                                                    }`}>{t.isOverdue && t.status !== "Completed" ? "Overdue" : t.status}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}

                                        {/* Daily Checklist Activity */}
                                        {stats.dailyActivity?.length > 0 && (
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                                                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                                        <TrendingUp className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">Daily Checklist Activity</h4>
                                                        <p className="text-[11px] text-slate-400 font-medium">Last 7 days</p>
                                                    </div>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                    {stats.dailyActivity.map((day: any, i: number) => (
                                                        <details key={i} className="group">
                                                            <summary className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[12px] font-bold text-slate-700">{day.date}</span>
                                                                    <span className="text-[11px] text-slate-400">{day.completed}/{day.total} items done</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${day.total ? Math.round((day.completed / day.total) * 100) : 0}%` }} />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-emerald-600">{day.total ? Math.round((day.completed / day.total) * 100) : 0}%</span>
                                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                                                                </div>
                                                            </summary>
                                                            <div className="px-5 pb-3 grid grid-cols-2 gap-1.5">
                                                                {day.items.map((item: any, j: number) => (
                                                                    <div key={j} className={`flex items-center gap-2 text-[11px] py-1 ${item.completed ? "text-slate-500" : "text-slate-400"}`}>
                                                                        <div className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center ${item.completed ? "bg-emerald-500" : "border border-gray-300"}`}>
                                                                            {item.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                                        </div>
                                                                        <span className={item.completed ? "line-through" : ""}>{item.title}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. SALARY DETAILS TAB */}
                {activeTab === "salary" && canViewStats && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Payroll & Compensation</h3>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> Basic Salary</p>
                                    <p className="text-sm font-medium text-slate-800">₹{profile.rawUser?.salaryDetails?.basicSalary?.toLocaleString() || "0"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> HRA</p>
                                    <p className="text-sm font-medium text-slate-800">₹{profile.rawUser?.salaryDetails?.hra?.toLocaleString() || "0"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> Allowances</p>
                                    <p className="text-sm font-medium text-slate-800">₹{profile.rawUser?.salaryDetails?.allowances?.toLocaleString() || "0"}</p>
                                </div>
                                <div className="bg-emerald-50/50 p-3 rounded-lg -m-3 border border-emerald-100/50">
                                    <p className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Total CTC (Yearly)</p>
                                    <p className="text-lg font-bold text-emerald-600">₹{((profile.rawUser?.salaryDetails?.basicSalary || 0) + (profile.rawUser?.salaryDetails?.hra || 0) + (profile.rawUser?.salaryDetails?.allowances || 0))?.toLocaleString()} <span className="text-xs font-semibold text-emerald-600/60 uppercase">/ year</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Bank & Statutory Details</h3>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-400" /> Bank Name</p>
                                    <p className="text-sm font-medium text-slate-800">{profile.rawUser?.bankName || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" /> Account Number</p>
                                    <p className="text-sm font-medium text-slate-800">{profile.rawUser?.accountNumber || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" /> IFSC Code</p>
                                    <p className="text-sm font-medium text-slate-800">{profile.rawUser?.ifscCode || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" /> PF Account</p>
                                    <p className="text-sm font-medium text-slate-800">{profile.rawUser?.pfAccount || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" /> ESI Account</p>
                                    <p className="text-sm font-medium text-slate-800">{profile.rawUser?.esiAccount || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. DOCUMENTS TAB */}
                {activeTab === "docs" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Document Vault</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {['aadhar', 'pan', 'resume', 'offerLetter', 'certificates'].map((docKey) => {
                                    const fileUrl = profile.rawUser?.documents?.[docKey];
                                    return (
                                        <div key={docKey} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 items-center hover:shadow-sm hover:border-blue-100 transition-all">
                                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-medium text-gray-800 capitalize">{docKey.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                                {fileUrl ? (
                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline mt-0.5 inline-block">
                                                        View Document →
                                                    </a>
                                                ) : (
                                                    <p className="text-xs font-medium text-gray-400 mt-0.5">Not uploaded</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. SYSTEM ACCESS TAB */}
                {activeTab === "access" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Access Control & Security</h3>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center border border-slate-100">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">System Role</p>
                                            <p className="text-[11px] font-medium text-slate-500">The permission level assigned to this account</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                                        {profile.rawUser?.role || "Employee"}
                                    </span>
                                </div>

                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Account Status</p>
                                            <p className="text-[11px] font-medium text-slate-500">Current login accessibility state</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${profile.rawUser?.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                        {profile.rawUser?.isActive ? 'Active Worker' : 'Inactive / Suspended'}
                                    </span>
                                </div>

                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Onboarding Pipeline</p>
                                            <p className="text-[11px] font-medium text-slate-500">Current state in HR onboarding</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${profile.rawUser?.onboardingStatus === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                        {profile.rawUser?.onboardingStatus || "Pending"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
