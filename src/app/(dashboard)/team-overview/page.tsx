"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Users, Mail, Phone, Briefcase, ExternalLink,
    Search, Filter, MoreHorizontal, UserCheck,
    Clock, CheckCircle, ArrowRight, Loader2, Download,
    ChevronDown, ChevronRight, User, AlertCircle, RefreshCw,
    CheckSquare, Activity, Calendar, LayoutGrid, ListTodo,
    Clock3, AlertTriangle, BarChart, ExternalLink as ViewIcon
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
    reportingManager?: any;
    teamLeader?: any;
    taskStats: {
        total: number;
        completed: number;
        inProgress: number;
        overdue: number;
        performance: number;
    };
    delegatedStats?: {
        total: number;
        completed: number;
        inProgress: number;
        overdue: number;
        performance: number;
    };
}

export default function TeamOverviewPage() {
    const { data: session } = useSession();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [allTasks, setAllTasks] = useState<any[]>([]); // Added to store raw tasks for filtering
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState("All");
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [selectedPriority, setSelectedPriority] = useState("All");
    const [expandedTls, setExpandedTls] = useState<string[]>([]);
    const managerId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    const fetchData = async () => {
        if (!managerId) return;
        setLoading(true);
        try {
            const [usersRes, tasksRes] = await Promise.all([
                axios.get("/api/users"),
                axios.get("/api/tasks")
            ]);

            const allUsers = usersRes.data.users || [];
            const allTasks = tasksRes.data || [];
            const today = moment();

            const enrichedUsers = allUsers.map((user: any) => {
                // 1. Direct Tasks: Assigned to this user by others
                const directTasks = allTasks.filter((t: any) => t.assignedTo === user._id);
                const completed = directTasks.filter((t: any) => t.status === 'Completed' || t.status === 'Done').length;
                const inProgress = directTasks.filter((t: any) => t.status === 'In Progress').length;
                const overdue = directTasks.filter((t: any) => {
                    if (t.status === 'Completed' || t.status === 'Done') return false;
                    return t.due && moment(t.due).isBefore(today, 'day');
                }).length;
                const total = directTasks.length;
                const performance = total > 0 ? Math.round((completed / total) * 100) : 0;

                // 2. Delegated Tasks: Created by this user and assigned to others (subordinates)
                const delegatedTasks = allTasks.filter((t: any) => t.createdBy === user._id && t.assignedTo !== user._id);
                const dCompleted = delegatedTasks.filter((t: any) => t.status === 'Completed' || t.status === 'Done').length;
                const dInProgress = delegatedTasks.filter((t: any) => t.status === 'In Progress').length;
                const dOverdue = delegatedTasks.filter((t: any) => {
                    if (t.status === 'Completed' || t.status === 'Done') return false;
                    return t.due && moment(t.due).isBefore(today, 'day');
                }).length;
                const dTotal = delegatedTasks.length;
                const dPerformance = dTotal > 0 ? Math.round((dCompleted / dTotal) * 100) : 0;

                return {
                    ...user,
                    taskStats: {
                        total,
                        completed,
                        inProgress,
                        overdue,
                        performance
                    },
                    delegatedStats: {
                        total: dTotal,
                        completed: dCompleted,
                        inProgress: dInProgress,
                        overdue: dOverdue,
                        performance: dPerformance
                    }
                };
            });

            setTeam(enrichedUsers);
            setAllTasks(allTasks); // Store for complex filtering
        } catch (err) {
            console.error("Failed to fetch task monitoring data:", err);
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

    const isDirectReport = (u: TeamMember) => {
        const managerIdStr = String(managerId);
        const uManagerId = u.reportingManager?._id || u.reportingManager;
        const uTLId = u.teamLeader?._id || u.teamLeader;

        const reportsDirectly = uManagerId && String(uManagerId) === managerIdStr;

        // Managers, Admins, and HR see the high-level hierarchy
        const managementRoles = ['Manager', 'Admin', 'HR Manager', 'HR', 'Assigned Manager'];
        const isManagementView = managementRoles.includes(userRole || '');

        if (isManagementView) {
            // If viewing as executive, only show TLs or independent employees at top level
            const hasTL = u.teamLeader && (typeof u.teamLeader === 'string' || u.teamLeader._id);
            if (u.role === 'Employee' && hasTL) return false;
            return reportsDirectly;
        }

        if (userRole === 'TL') {
            // TLs always see their own team members at top level
            return (uTLId && String(uTLId) === managerIdStr) || reportsDirectly;
        }

        return reportsDirectly;
    };

    const getSubordinates = (tlId: string) => {
        return team.filter((u: any) => {
            const uTLId = u.teamLeader?._id || u.teamLeader;
            return uTLId && String(uTLId) === String(tlId) && u.role === 'Employee';
        });
    };

    // Correct filtering logic
    const filteredData = team.filter((member) => {
        const matchesSearch =
            member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            selectedFilter === "All" ||
            (selectedFilter === "Completed" && member.taskStats.performance === 100) ||
            (selectedFilter === "In Progress" && member.taskStats.inProgress > 0) ||
            (selectedFilter === "Overdue" && member.taskStats.overdue > 0);

        const matchesDept = selectedDepartment === "All" || member.department === selectedDepartment;

        const matchesPriority = selectedPriority === "All" ||
            allTasks.some(task =>
                task.assignedTo === member._id &&
                task.priority === selectedPriority
            );

        return matchesSearch && matchesStatus && matchesDept && matchesPriority;
    });

    const departments = Array.from(new Set(team.map(m => m.department).filter(Boolean)));

    const directReports = filteredData.filter(isDirectReport);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading task monitoring dashboard...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans text-slate-800">
            {/* KPI Header section - Task Monitoring Style */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { label: "Total Tasks", value: team.reduce((acc, u) => acc + u.taskStats.total, 0), icon: ListTodo, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Completed", value: team.reduce((acc, u) => acc + u.taskStats.completed, 0), icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "In Progress", value: team.reduce((acc, u) => acc + u.taskStats.inProgress, 0), icon: Clock3, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Overdue", value: team.reduce((acc, u) => acc + u.taskStats.overdue, 0), icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Team Productivity", value: `${Math.round(team.reduce((acc, u) => acc + u.taskStats.performance, 0) / (team.length || 1))}%`, icon: BarChart, color: "text-indigo-600", bg: "bg-indigo-50" },
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

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-blue-600" /> Task Monitoring
                    </h2>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tasks or members..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                        <option value="All">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue">Overdue</option>
                    </select>
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                    >
                        <option value="All">All Priority</option>
                        <option value="High">High Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Low">Low Priority</option>
                    </select>
                    <button
                        onClick={fetchData}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                        title="Refresh Data"
                    >
                        <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin text-blue-600")} />
                    </button>
                </div>
            </div>

            {/* High Density Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4 w-12 text-center"></th>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4 text-center">My Tasks</th>
                            <th className="px-6 py-4 text-center">Delegated</th>
                            <th className="px-6 py-4 text-center">Team Overdue</th>
                            <th className="px-6 py-4">Performance</th>
                            <th className="px-6 py-4">Team Progress</th>
                            <th className="px-6 py-4 text-right">View</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {directReports.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-20 text-center">
                                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-900">No Teams assigned to you</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                                        Use the <Link href="/manage-teams" className="text-blue-600 font-bold hover:underline">Manage Teams</Link> menu to assign members to your reporting line.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            directReports.map(member => {
                                const isExpanded = expandedTls.includes(member._id);
                                const subordinates = getSubordinates(member._id);
                                const hasSubordinates = subordinates.length > 0;

                                return (
                                    <React.Fragment key={member._id}>
                                        {/* Main Row */}
                                        <tr className={clsx("hover:bg-blue-50/30 transition-colors border-b border-slate-100 group", isExpanded && "bg-blue-50/20")}>
                                            <td className="px-6 py-4 text-center">
                                                {hasSubordinates && (
                                                    <button
                                                        onClick={() => toggleExpand(member._id)}
                                                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                                                        member.role === 'TL' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                                    )}>
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                            {member.name}
                                                            {member.role === 'TL' && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-1 uppercase">TL</span>}
                                                        </p>
                                                        <p className="text-[11px] font-medium text-slate-500">{member.role} • {member.department || 'General'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-700">{member.taskStats.total}</td>
                                            <td className="px-6 py-4 text-center font-bold text-blue-600">{member.delegatedStats?.total || 0}</td>
                                            <td className="px-6 py-4 text-center font-bold text-rose-600">{member.delegatedStats?.overdue || 0}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx("h-full transition-all duration-500", member.taskStats.performance >= 80 ? "bg-emerald-500" : "bg-blue-500")}
                                                            style={{ width: `${member.taskStats.performance}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600">{member.taskStats.performance}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {member.role === 'TL' && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-indigo-50 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-indigo-500 transition-all duration-500"
                                                                style={{ width: `${member.delegatedStats?.performance || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-indigo-600">{member.delegatedStats?.performance || 0}%</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/tasks?user=${member._id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-block">
                                                    <ViewIcon className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>

                                        {/* Underlings */}
                                        {isExpanded && subordinates.map(sub => (
                                            <tr key={sub._id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-slate-100 group/sub">
                                                <td className="px-6 py-4"></td>
                                                <td className="px-6 py-4 pl-12 border-l-2 border-blue-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                                                            {sub.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-700 group-hover/sub:text-blue-600 transition-colors">{sub.name}</p>
                                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{sub.role}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-semibold text-slate-600">{sub.taskStats.total}</td>
                                                <td className="px-6 py-4 text-center font-semibold text-slate-400">-</td>
                                                <td className="px-6 py-4 text-center font-semibold text-slate-400">-</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                                style={{ width: `${sub.taskStats.performance}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500">{sub.taskStats.performance}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-semibold text-slate-400">-</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link href={`/tasks?user=${sub._id}`} className="p-1.5 text-slate-300 hover:text-blue-500 transition-all inline-block">
                                                        <ViewIcon className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend - Delegation Workflow */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-6 items-center justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">My Tasks (Direct)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delegated Work</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Manager-to-TL Delegation Monitoring</span>
                </div>
            </div>
        </div>
    );
}
