"use client";

import { useState, useEffect } from "react";
import {
    Users, Briefcase, TrendingUp, TrendingDown, Bell, Search,
    ChevronDown, Eye, Edit, Trash2, Clock, CheckSquare,
    UserCheck, UserMinus, UserX, UserPlus, Gift, Calendar as CalendarIcon,
    ArrowUpRight, ArrowDownRight, MoreHorizontal, PieChart, BarChart3, HelpCircle, Bug, DollarSign,
    ClipboardList, FileWarning, Trophy, ExternalLink, FileText, GraduationCap, LayoutDashboard, ListTodo, Megaphone, TicketCheck
} from "lucide-react";
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import ManagerDashboard from "@/frontend/components/ManagerDashboard";
import TLDashboard from "@/frontend/components/TLDashboard";
import axios from "axios";
import toast from "react-hot-toast";
import Link from "next/link";
import EmployeeEditModal from "@/frontend/components/EmployeeEditModal";


ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Components ─────────────────────────────────────────────────────────────

function KPICard({ title, value, subtitle, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-[#ffffff] rounded-[14px] p-5 shadow-sm border border-[#e5e7eb] hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-3">
                <div className={clsx("p-2 rounded-[10px] transition-colors duration-300", color)}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <div className={clsx(
                        "flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold",
                        trend.up ? "bg-green-50 text-[#16a34a]" : "bg-red-50 text-[#dc2626]"
                    )}>
                        {trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend.value}
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-[28px] font-bold text-[#111827] tracking-tight leading-none mb-1">{value}</h3>
                <p className="text-[14px] font-semibold text-[#374151]">{title}</p>
                <p className="text-[13px] font-medium text-[#6b7280] mt-1">{subtitle}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, string> = {
        Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
        "On Leave": "bg-amber-50 text-amber-600 border-amber-100",
        Inactive: "bg-slate-50 text-slate-400 border-slate-100",
        Approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Pending: "bg-blue-50 text-blue-600 border-blue-100",
        Rejected: "bg-rose-50 text-rose-600 border-rose-100",
    };
    return (
        <span className={clsx(
            "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
            cfg[status] || "bg-slate-50 text-slate-400 border-slate-100"
        )}>
            {status}
        </span>
    );
}

// ─── Dashboards ─────────────────────────────────────────────────────────────

function HRDashboard({ data, performanceData, departmentData, leaveDistributionData, payrollData, onOnboardingAction }: any) {
    const [currentDate, setCurrentDate] = useState<string>("");

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, []);

    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    const handleEditClick = async (empId: string) => {
        try {
            // We need full employee data, fetch it or find in table if available
            const empSnapshot = data?.tables?.employeeSnapshot?.find((e: any) => e.id === empId);
            if (empSnapshot) {
                // Fetch full data for the modal
                const res = await axios.get(`/api/users`);
                const fullEmp = res.data?.users?.find((u: any) => u._id === empId);
                if (fullEmp) {
                    setSelectedEmployee(fullEmp);
                    setShowEditModal(true);
                }
            }
        } catch (error) {
            console.error("Failed to fetch employee details for edit:", error);
            toast.error("Failed to load employee details.");
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Holiday Banner */}
            {data?.stats?.holidayToday && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                <Gift className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Today is a Company Holiday!</h3>
                                <p className="text-blue-100 font-medium">Enjoy the <b>{data.stats.holidayToday}</b>. All attendance is marked as Holiday.</p>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest border border-white/20">
                                Holiday Mode Active
                            </span>
                        </div>
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                </div>
            )}

            {/* Header with Live Date */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[22px] font-semibold text-gray-900">HR Management System</h2>
                    <p className="text-sm font-medium text-gray-500">
                        Today is {currentDate || "Loading date..."}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">+12</div>
                    </div>
                </div>
            </div>

            {/* 1. HR KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { title: "Total Employees", value: data?.stats?.totalEmployees || 0, subtitle: "Active", icon: Users, color: "bg-blue-50 text-blue-600", trend: "+0%", href: "/employees" },
                    { title: "Present Today", value: data?.stats?.presentToday || 0, subtitle: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: UserCheck, color: "bg-emerald-50 text-emerald-600", trend: "Normal", href: "/admin/attendance?filter=present-today" },
                    { title: "On Leave Today", value: data?.stats?.onLeaveToday || 0, subtitle: "Approved", icon: CalendarIcon, color: "bg-amber-50 text-amber-600", trend: "0%", href: "/leave-tracker?filter=today" },
                    { title: "Pending Leaves", value: data?.stats?.pendingLeaves || 0, subtitle: "Action Required", icon: Clock, color: "bg-rose-50 text-rose-600", trend: data?.stats?.pendingLeaves > 5 ? "High" : "Low", href: "#leave-requests" },
                    { title: "New Joinees", value: data?.stats?.newJoineesMonth || 0, subtitle: new Date().toLocaleDateString('en-US', { month: 'long' }), icon: UserPlus, color: "bg-purple-50 text-purple-600", trend: "This month", href: "/employees" },
                    { title: "Pending Onboarding", value: data?.stats?.pendingOnboarding || 0, subtitle: "Action Required", icon: UserCheck, color: "bg-blue-50 text-blue-600", trend: data?.stats?.pendingOnboarding > 0 ? "Pending" : "None", href: "#onboarding-approvals" },
                    { title: "Birthdays", value: data?.stats?.birthdaysToday || 0, subtitle: "Coming Up", icon: Gift, color: "bg-pink-50 text-pink-600", trend: "Today", href: "/admin/employees/birthdays" },
                    {
                        title: "Daily Reports", 
                        value: data?.stats?.dailyReportsToday || 0, 
                        subtitle: "View All", 
                        icon: FileText, 
                        color: "bg-blue-50 text-blue-600", 
                        trend: "Today", 
                        href: "/daily-reports" 
                    },
                    {
                        title: "Absent Today",
                        value: data?.stats?.absentToday || 0,
                        subtitle: data?.stats?.holidayToday ? "Holiday Override" : "Not Checked In",
                        icon: UserX,
                        color: data?.stats?.holidayToday ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600",
                        status: data?.stats?.holidayToday ? "Holiday" : (data?.stats?.absentToday > 0 ? "Warning" : "Normal"),
                        href: "/admin/attendance?filter=absent-today"
                    },
                    {
                        title: "Late Arrivals",
                        value: data?.stats?.lateArrivals || 0,
                        subtitle: "After 10:00 AM",
                        icon: Clock,
                        color: "bg-amber-50 text-amber-600",
                        status: (data?.stats?.lateArrivals > 10 ? "High" : data?.stats?.lateArrivals > 0 ? "Medium" : "Low"),
                        href: "/admin/attendance?filter=late-arrival"
                    },
                    {
                        title: "Probation Ending",
                        value: data?.stats?.probationEndingMonth || 0,
                        subtitle: "Confirmation Required",
                        icon: ClipboardList,
                        color: "bg-purple-50 text-purple-600",
                        status: "Action Required",
                        href: "/admin/employees/probation?filter=ending-soon"
                    },
                    {
                        title: "Pending Docs",
                        value: data?.stats?.pendingDocuments || 0,
                        subtitle: "Compliance Pending",
                        icon: FileWarning,
                        color: "bg-orange-50 text-orange-600",
                        status: "Action Required",
                        href: "/employees?filter=pending-docs"
                    },
                    {
                        title: "Anniversaries",
                        value: data?.stats?.workAnniversariesMonth || 0,
                        subtitle: "Celebrate Milestones",
                        icon: Trophy,
                        color: "bg-indigo-50 text-indigo-600",
                        status: "Normal",
                        href: "/admin/employees/anniversaries"
                    },
                ].map((stat: any, idx) => (
                    <Link href={stat.href} key={idx} className="bg-white p-5 rounded-[12px] border border-gray-100 shadow-sm hover:shadow-md transition-all group block relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className={clsx("p-2 rounded-lg group-hover:scale-110 transition-transform", stat.color)}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            {stat.trend ? (
                                <span className={clsx(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                    stat.trend.includes('+') ? "bg-green-50 text-green-600" :
                                        stat.trend.includes('-') ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
                                )}>{stat.trend}</span>
                            ) : stat.status ? (
                                <span className={clsx(
                                    "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border",
                                    stat.status === "Warning" || stat.status === "Action Required" || stat.status === "High" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                        stat.status === "Medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                            stat.status === "Holiday" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                                "bg-emerald-50 text-emerald-600 border-emerald-100"
                                )}>{stat.status}</span>
                            ) : null}
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900">{stat.value}</h4>
                        <p className="text-sm font-semibold text-gray-800 mt-1">{stat.title}</p>
                        <p className="text-[12px] font-medium text-gray-500 mt-0.5">{stat.subtitle}</p>
                    </Link>
                ))}
            </div>

            {/* 2. Employee Snapshot Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leave Distribution - Spanning more columns now since Attendance is gone */}
                <div className="lg:col-span-3 bg-white p-6 rounded-[12px] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">Leave Distribution</h3>
                            <p className="text-xs font-semibold text-gray-500">Current month requests</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Paid</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Sick</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <div className="h-[250px] w-full md:w-1/3 relative">
                            <Doughnut data={leaveDistributionData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '70%',
                                plugins: { legend: { display: false } }
                            }} />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <p className="text-3xl font-bold text-gray-900">
                                    {data?.charts?.leaveDistribution?.data?.reduce((a: number, b: number) => a + b, 0) || 0}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Total</p>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                            {(data?.charts?.leaveDistribution?.labels || []).map((label: string, i: number) => (
                                <div key={i} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100/50 flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{data?.charts?.leaveDistribution?.data[i] || 0}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Onboarding Approvals Table */}
                <div id="onboarding-approvals" className="lg:col-span-2 bg-white rounded-[12px] border border-gray-100 shadow-sm overflow-hidden flex flex-col scroll-mt-20">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">Onboarding Approvals</h3>
                        <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{data?.stats?.pendingOnboarding || 0} Pending</span>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest text-center">Manager</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest text-center">HR</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(data?.tables?.onboardingApprovals || []).length > 0 ? (data?.tables?.onboardingApprovals || []).map((oa: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 border-b">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                                    {oa.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{oa.name}</p>
                                                    <p className="text-[11px] font-medium text-gray-500">{oa.designation || oa.role} • {oa.dept}</p>
                                                    <p className="text-[10px] text-blue-600 font-bold mt-0.5">Manager: {oa.manager}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-b text-center">
                                            <StatusBadge status={oa.managerStatus} />
                                        </td>
                                        <td className="px-6 py-4 border-b text-center">
                                            <StatusBadge status={oa.hrStatus} />
                                        </td>
                                        <td className="px-6 py-4 border-b">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onOnboardingAction(oa.id, 'Approved')}
                                                    className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                                                    title="Approve Onboarding"
                                                >
                                                    <CheckSquare className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onOnboardingAction(oa.id, 'Rejected')}
                                                    className="p-1.5 bg-white text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-50 transition-all shadow-sm"
                                                    title="Reject Onboarding"
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-gray-400">
                                            No pending onboarding approvals found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Leave Requests Panel */}
                <div id="leave-requests" className="bg-white rounded-[12px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-20">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">Leave Requests</h3>
                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase">{data?.stats?.pendingLeaves || 0} Pending</span>
                    </div>
                    <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                        {(data?.tables?.leaveRequests || []).length > 0 ? (data?.tables?.leaveRequests || []).map((req: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-50 bg-gray-50/30 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{req.name}</p>
                                        <p className="text-[11px] font-medium text-blue-600">{req.type}</p>
                                    </div>
                                    <p className="text-[11px] font-semibold text-gray-400">{req.date}</p>
                                </div>
                                <p className="text-[12px] text-gray-600 line-clamp-2 italic">"{req.reason}"</p>
                                <div className="flex items-center gap-2 pt-1">
                                    <button className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-all shadow-sm">Approve</button>
                                    <button className="flex-1 py-1.5 bg-white text-gray-500 border border-gray-200 rounded-lg text-[11px] font-bold hover:bg-gray-50 transition-all">Reject</button>
                                </div>
                            </div>
                        )) : (
                            <div className="py-10 text-center text-sm font-medium text-gray-400 italic">
                                All clear! No pending leave requests.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Snapshot Table */}
                <div className="lg:col-span-2 bg-white rounded-[12px] border border-gray-100 shadow-sm overflow-hidden text-black">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">Employee Snapshot</h3>
                        <Link href="/employees" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                            Open Employee Directory
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Department</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Attendance %</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(data?.tables?.employeeSnapshot || []).map((emp: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 border-b">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                                    {emp.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                                                    <p className="text-[11px] font-medium text-gray-500">{emp.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-b text-[13px] font-semibold text-gray-700">{emp.dept}</td>
                                        <td className="px-6 py-4 border-b">
                                            <StatusBadge status={emp.status} />
                                        </td>
                                        <td className="px-6 py-4 border-b">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-emerald-500 h-1" style={{ width: `${emp.attendance}%` }}></div>
                                                </div>
                                                <span className="text-[12px] font-semibold text-gray-700">{emp.attendance}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-b">
                                            <button 
                                                onClick={() => handleEditClick(emp.id)}
                                                className="p-1 px-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-[11px] font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Announcements Widget */}
                <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">Recent Broadcasts</h3>
                        </div>
                        <Link href="/announcements" className="text-xs font-semibold text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[350px]">
                        {data?.announcements?.length > 0 ? data.announcements.map((ann: any, idx: number) => (
                            <div key={idx} className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-4">{ann.title}</h4>
                                    <span className={clsx("w-2 h-2 rounded-full shrink-0", ann.priority === 'Urgent' ? 'bg-rose-500' : ann.priority === 'Important' ? 'bg-amber-500' : 'bg-blue-500')} title={`Priority: ${ann.priority}`} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-400 font-semibold">{ann.date}</p>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">{ann.priority || 'General'}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                <Bell className="w-8 h-8 text-gray-200 mb-3" />
                                <p className="text-sm font-semibold text-gray-400">No broadcasts found</p>
                                <p className="text-[11px] text-gray-400 mt-1">Create one from Announcements</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Payroll & Performance Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Distribution */}
                <div className="bg-white p-6 rounded-[12px] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Department Distribution</h3>
                    <div className="h-[250px]">
                        <Bar data={departmentData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 } } },
                                y: { grid: { color: "#f3f4f6" }, ticks: { font: { size: 10, weight: 600 } } }
                            }
                        }} />
                    </div>
                </div>

                {/* Payroll Summary */}
                <div className="bg-[#1F6F8B] p-8 rounded-[12px] shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform text-white">
                        <DollarSign className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-semibold uppercase tracking-widest rounded-full backdrop-blur-sm">
                                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2 leading-tight">Payroll Summary</h3>
                            <p className="text-blue-50/70 text-sm font-medium mb-8 max-w-[300px]">
                                Next processing date is {new Date().toLocaleDateString('en-US', { month: 'short' })} 30th. Ensure all attendance is finalized by {new Date().toLocaleDateString('en-US', { month: 'short' })} 28th.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/5">
                                    <p className="text-blue-50/60 text-[11px] font-bold uppercase tracking-wider mb-1">Total Payout</p>
                                    <p className="text-xl font-bold text-white">$452,180</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/5">
                                    <p className="text-blue-50/60 text-[11px] font-bold uppercase tracking-wider mb-1">Tax Deductions</p>
                                    <p className="text-xl font-bold text-white">$68,400</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button className="flex-1 bg-white text-[#1F6F8B] py-3 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all shadow-md">Process Payroll</button>
                            <button className="flex-1 bg-white/10 text-white border border-white/20 py-3 rounded-xl text-xs font-bold hover:bg-white/20 transition-all">Download Report</button>
                        </div>
                    </div>
                </div>
            </div>

            <EmployeeEditModal 
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                editingId={selectedEmployee?._id || selectedEmployee?.id}
                employees={data?.tables?.employeeSnapshot || []}
                initialData={selectedEmployee}
                onSuccess={(msg) => {
                    toast.success(msg);
                }}
            />
        </div>
    );
}

function EmployeeDashboard({ session, data }: any) {
    const today = new Date();
    const greeting = today.getHours() < 12 ? "Good Morning" : today.getHours() < 17 ? "Good Afternoon" : "Good Evening";

    const tasksList = data?.myTasks || [
        { title: "Review frontend PR", priority: "High", due: "Today", status: "Pending" },
        { title: "Update client presentation", priority: "Medium", due: "Tomorrow", status: "In Progress" },
        { title: "Prepare weekly report", priority: "Low", due: "Oct 15", status: "Pending" }
    ];

    const projectsList = data?.myProjects || [
        { name: "Project Phoenix Redesign", status: "Active", progress: 65, client: "TechCorp" },
        { name: "Q3 Marketing Campaign", status: "On Track", progress: 85, client: "Acme Inc" },
        { name: "Website Overhaul", status: "Delayed", progress: 30, client: "Global Systems" },
    ];

    const ticketsList = data?.myTickets || [
        { title: "Wi-Fi connectivity issue", priority: "High", status: "Open", category: "IT" },
        { title: "Access to Figma project", priority: "Medium", status: "In Progress", category: "General" }
    ];

    const announcementsList = data?.announcements || [];

    const priorityDot = (p: string) =>
        p === 'High' ? 'bg-[#c62828]' : p === 'Medium' ? 'bg-[#e65100]' : 'bg-[#9e9e9e]';

    const priorityBg = (p: string) =>
        p === 'High' ? 'bg-[#fce4ec] text-[#c62828]' : p === 'Medium' ? 'bg-[#fff3e0] text-[#e65100]' : 'bg-[#f5f5f5] text-[#666]';

    const statusStyle = (s: string) =>
        s === 'Completed' || s === 'Done' ? 'bg-[#e6f9f0] text-[#00875a]' :
            s === 'In Progress' ? 'bg-[#e3f2fd] text-[#1565c0]' :
                s === 'Open' ? 'bg-[#e3f2fd] text-[#1565c0]' :
                    'bg-[#f5f5f5] text-[#666]';

    const [currentDate, setCurrentDate] = useState<string>("");

    useEffect(() => {
        setCurrentDate(today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, []);

    return (
        <div className="space-y-5 pb-6">
            {/* ─── Greeting Header ─────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-[#333]">
                        {greeting}, {session?.user?.name || 'User'}
                    </h1>
                    <p className="text-[14px] text-[#888] mt-0.5">
                        {currentDate || "Loading date..."}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#4a90d9] flex items-center justify-center text-white text-[14px] font-semibold">
                    {session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'U'}
                </div>
            </div>

            {/* Summary Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                    { label: "Total Tasks", value: ((data?.stats?.myPendingTasks ?? 0) + (data?.completedTasks ?? 0)) || (data ? 0 : 168), color: "#4a90d9", icon: CheckSquare },
                    { label: "Pending", value: data?.stats?.myPendingTasks ?? 48, color: "#e65100", icon: Clock },
                    { label: "On Time", value: data?.stats?.onTimeCheckins ?? 0, color: "#00875a", icon: UserCheck, href: "/admin/attendance?filter=on-time" },
                    { label: "Early Exits", value: data?.stats?.earlyExits ?? 0, color: "#e65100", icon: Clock, href: "/admin/attendance?filter=early-exit" },
                    { label: "Today Break", value: `${data?.stats?.todayBreak ?? 0}m`, color: "#4a90d9", icon: PieChart, href: "/admin/attendance?filter=on-break" },
                    { label: "Auto Closed", value: data?.stats?.autoClosedToday ?? 0, color: "#6b7280", icon: Clock, href: "/admin/attendance?filter=auto-closed" },
                ].map((card, idx) => (
                    <Link 
                        href={(card as any).href || "#"} 
                        key={idx} 
                        className="bg-white rounded-lg border border-[#e0e0e0] px-4 py-3.5 hover:shadow-sm transition-shadow block"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${card.color}14`, color: card.color }}
                            >
                                <card.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-semibold leading-tight" style={{ color: card.color }}>{card.value}</p>
                                <p className="text-[13px] text-[#888] font-medium mt-0.5">{card.label}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ─── Main Content Grid ───────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* ─── Left Column: Tasks Table ────────────── */}
                <div className="xl:col-span-2 space-y-5">
                    {/* Tasks Table */}
                    <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee]">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-[#4a90d9]" />
                                <h3 className="text-[16px] font-semibold text-[#333]">My Tasks</h3>
                                <span className="text-[12px] text-[#999] font-normal">Assigned to you</span>
                            </div>
                            <a href="/tasks" className="text-[13px] text-[#0c66e4] font-medium hover:underline">View All</a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Task</th>
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Due</th>
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Priority</th>
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasksList.map((task: any, idx: number) => (
                                        <tr key={idx} className="border-b border-[#f0f0f0] hover:bg-[#f8fafd] transition-colors group">
                                            <td className="px-4 py-3">
                                                <p className="text-[14px] font-medium text-[#333] group-hover:text-[#0c66e4] transition-colors">{task.title}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[13px] text-[#666] flex items-center gap-1.5">
                                                    <CalendarIcon className="w-3.5 h-3.5 text-[#bbb]" />
                                                    {task.due || 'TBD'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium ${priorityBg(task.priority)}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${priorityDot(task.priority)}`}></span>
                                                    {task.priority || "Normal"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-[12px] font-medium ${statusStyle(task.status)}`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {tasksList.length === 0 && (
                            <div className="py-12 text-center text-[13px] text-[#999]">No tasks assigned yet</div>
                        )}
                    </div>

                    {/* Support Tickets */}
                    <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee]">
                            <div className="flex items-center gap-2">
                                <Bug className="w-4 h-4 text-[#e65100]" />
                                <h3 className="text-[16px] font-semibold text-[#333]">Support Tickets</h3>
                                <span className="text-[12px] text-[#999] font-normal">Issues reported by you</span>
                            </div>
                            <a href="/support" className="text-[13px] text-[#0c66e4] font-medium hover:underline">View All</a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Ticket</th>
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Category</th>
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Priority</th>
                                        <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#666] uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ticketsList.map((ticket: any, idx: number) => (
                                        <tr key={idx} className="border-b border-[#f0f0f0] hover:bg-[#f8fafd] transition-colors group">
                                            <td className="px-4 py-3">
                                                <p className="text-[14px] font-medium text-[#333] group-hover:text-[#0c66e4] transition-colors">{ticket.title}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[12px] text-[#888] font-medium uppercase tracking-wide">{ticket.category}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium ${priorityBg(ticket.priority)}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${priorityDot(ticket.priority)}`}></span>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-[12px] font-medium ${statusStyle(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Actions - moved to left column */}
                    <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#eee]">
                            <ArrowUpRight className="w-4 h-4 text-[#00875a]" />
                            <h3 className="text-[16px] font-semibold text-[#333]">Quick Actions</h3>
                        </div>
                        <div className="p-3 grid grid-cols-4 gap-2">
                            {[
                                { label: "Apply Leave", href: "/leave-tracker", icon: CalendarIcon, color: "#7b1fa2" },
                                { label: "Daily Report", href: "/daily-reports", icon: FileText, color: "#4a90d9" },
                                { label: "View Attendance", href: "/attendance", icon: UserCheck, color: "#00875a" },
                                { label: "My Tasks", href: "/tasks", icon: CheckSquare, color: "#0c66e4" },
                                { label: "Raise Ticket", href: "/support", icon: HelpCircle, color: "#e65100" },
                            ].map((action, idx) => (
                                <a
                                    key={idx}
                                    href={action.href}
                                    className="flex items-center gap-2 px-3 py-3 rounded-lg border border-[#eee] hover:border-[#d0d0d0] hover:bg-[#f8fafd] transition-all text-[14px] font-medium text-[#555]"
                                >
                                    <action.icon className="w-4 h-4" style={{ color: action.color }} />
                                    {action.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Right Column: Projects + Updates ────── */}
                <div className="space-y-5">
                    {/* My Projects */}
                    <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee]">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-[#7b1fa2]" />
                                <h3 className="text-[16px] font-semibold text-[#333]">My Projects</h3>
                            </div>
                            <a href="/projects" className="text-[13px] text-[#0c66e4] font-medium hover:underline">View All</a>
                        </div>
                        <div className="divide-y divide-[#f0f0f0]">
                            {projectsList.map((proj: any, idx: number) => (
                                <div key={idx} className="px-4 py-3.5 hover:bg-[#f8fafd] transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <p className="text-[15px] font-medium text-[#333] group-hover:text-[#0c66e4] transition-colors leading-tight">{proj.name}</p>
                                        <span className={clsx(
                                            "text-[12px] font-medium px-2 py-0.5 rounded ml-2 flex-shrink-0",
                                            proj.status === 'Active' ? 'bg-[#e3f2fd] text-[#1565c0]' :
                                                proj.status === 'Delayed' ? 'bg-[#fce4ec] text-[#c62828]' :
                                                    'bg-[#e6f9f0] text-[#00875a]'
                                        )}>
                                            {proj.status}
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-[#999] mb-2">{proj.client}</p>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex-1 bg-[#f0f0f0] rounded-full h-[5px] overflow-hidden">
                                            <div
                                                className={clsx(
                                                    "h-[5px] rounded-full transition-all duration-700",
                                                    proj.status === 'Active' ? 'bg-[#1565c0]' :
                                                        proj.status === 'Delayed' ? 'bg-[#c62828]' : 'bg-[#00875a]'
                                                )}
                                                style={{ width: `${proj.progress}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[13px] font-semibold text-[#666] w-8 text-right">{proj.progress}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Team Updates */}
                    <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee]">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-[#0c66e4]" />
                                <h3 className="text-[16px] font-semibold text-[#333]">Announcements</h3>
                            </div>
                        </div>
                        <div className="divide-y divide-[#f0f0f0]">
                            {announcementsList.length > 0 ? announcementsList.map((ann: any, idx: number) => (
                                <div key={idx} className="px-4 py-3.5 hover:bg-[#f8fafd] transition-colors cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className={clsx("w-2 h-2 rounded-full mt-2 flex-shrink-0", ann.priority === 'High' ? 'bg-[#c62828]' : ann.priority === 'Medium' ? 'bg-[#0c66e4]' : 'bg-[#e0e0e0]')}></div>
                                        <div>
                                            <p className="text-[15px] font-medium text-[#333] leading-snug">
                                                {ann.title}
                                            </p>
                                            <p className="text-[13px] text-[#999] mt-1">{ann.date}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-4 py-8 text-center text-[#888] text-[13px]">No recent announcements</div>
                            )}
                        </div>
                        <div className="px-4 py-2.5 border-t border-[#eee] bg-[#fafafa]">
                            <a href="/announcements" className="text-[14px] text-[#0c66e4] font-medium hover:underline">View all announcements</a>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/dashboard/stats');
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to load dashboard data");
                if (result.error) throw new Error(result.error);
                setData(result);
            } catch (err: any) {
                console.error("Failed to fetch dashboard stats:", err);
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleOnboardingAction = async (userId: string, status: 'Approved' | 'Rejected') => {
        try {
            await axios.patch("/api/onboarding/approve", { userId, approvalType: 'hr', status });
            toast.success(`Onboarding ${status.toLowerCase()} successfully`);

            // Re-fetch data to refresh dashboard
            const res = await fetch('/api/dashboard/stats');
            const result = await res.json();
            if (res.ok) setData(result);

        } catch (err: any) {
            console.error(`Failed to ${status} onboarding:`, err);
            toast.error(err.response?.data?.error || `Failed to ${status} onboarding.`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px]">
                <p className="text-xl font-bold text-rose-500 mb-2">Oops! Something went wrong.</p>
                <p className="text-sm font-medium text-gray-500 max-w-md text-center">
                    {error || "The dashboard data could not be loaded. Please ensure your backend is accessible and your session is active, or try restarting the development server."}
                </p>
                <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-[#1F6F8B] text-white rounded-lg text-sm font-bold shadow-sm">
                    Retry
                </button>
            </div>
        );
    }

    const performanceData = {
        labels: data?.charts?.performanceTrend?.labels || [],
        datasets: [{
            label: 'Attendance %',
            data: data?.charts?.performanceTrend?.data || [],
            borderColor: '#1F6F8B',
            backgroundColor: 'rgba(15, 23, 42, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
        }]
    };

    const departmentData = {
        labels: data?.charts?.departments?.labels || [],
        datasets: [{
            data: data?.charts?.departments?.data || [],
            backgroundColor: '#3b82f6',
            borderRadius: 6,
        }]
    };

    const leaveDistributionData = {
        labels: data?.charts?.leaveDistribution?.labels || [],
        datasets: [{
            data: data?.charts?.leaveDistribution?.data || [],
            backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'],
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    const userRole = (session?.user as any)?.role;
    const isHRAdmin = ["Admin", "HR", "HR Manager"].includes(userRole);
    const isManager = userRole === "Manager" || userRole === "Assigned Manager";
    const isTL = userRole === "TL";

    if (isHRAdmin) {
        return (
            <HRDashboard
                data={data}
                performanceData={performanceData}
                departmentData={departmentData}
                leaveDistributionData={leaveDistributionData}
                onOnboardingAction={handleOnboardingAction}
            />
        );
    }

    if (isManager) {
        return <ManagerDashboard session={session} data={data} />;
    }

    if (isTL) {
        return <TLDashboard session={session} data={data} />;
    }

    return <EmployeeDashboard session={session} data={data} />;
}

