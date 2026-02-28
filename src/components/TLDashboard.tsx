"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Users, Briefcase, TrendingUp, Clock, CheckSquare,
    Search, Bell, FileText, BarChart3, PieChart, Users2, AlertTriangle, Play
} from "lucide-react";
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import clsx from "clsx";
import axios from "axios";
import toast from "react-hot-toast";

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

function KPICard({ title, value, trend, icon: Icon, color, onClick }: any) {
    const isPositive = trend.includes('+') || trend === 'Normal';
    const trendColor = isPositive ? 'text-emerald-600 bg-emerald-50' : trend.includes('-') ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50';

    return (
        <div 
            onClick={onClick}
            className={clsx(
                "bg-white rounded-[8px] p-5 border border-gray-200 hover:border-blue-300 transition-all flex flex-col justify-between h-full relative",
                onClick && "cursor-pointer hover:bg-slate-50/50"
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={clsx(
                    "p-2 rounded-[6px]",
                    color === 'blue' ? "bg-blue-50 text-blue-600" :
                        color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                            color === 'rose' ? "bg-rose-50 text-rose-600" :
                                color === 'amber' ? "bg-amber-50 text-amber-600" :
                                    "bg-slate-50 text-slate-600"
                )}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                {trend && (
                    <span className={clsx("text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1", trendColor)}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-[26px] font-bold text-slate-900 tracking-tight leading-none mb-1">{value}</h3>
                <p className="text-[12px] font-medium text-slate-500">{title}</p>
            </div>
        </div>
    );
}

export default function TLDashboard({ session, data: initialData }: any) {
    const router = useRouter();
    const [data, setData] = useState(initialData || {});
    const [loading, setLoading] = useState(!initialData);

    const fetchData = async () => {
        try {
            // Re-using manager stats API route for now as it provides team-wide context
            const res = await fetch('/api/dashboard/stats');
            const result = await res.json();
            if (result.stats) {
                setData(result);
            }
        } catch (err) {
            console.error("Failed to fetch TL stats:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialData) fetchData();
    }, [initialData]);

    if (loading && !data?.stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const stats = data?.stats || {
        totalEmployees: 0,
        presentToday: 0,
        onLeaveToday: 0,
        lateLogins: 0,
        activeProjects: 0,
        overdueTasks: 0,
        teamProductivity: 0,
        pendingTasks: 0
    };

    // LIVE DATA FOR CHARTS FROM API
    const weeklyAttendanceData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{
            label: 'Present',
            data: data?.weeklyAttendance?.present || [0, 0, 0, 0, 0],
            backgroundColor: '#2563EB',
            borderRadius: 4,
            barPercentage: 0.6
        }, {
            label: 'Absent/Leave',
            data: data?.weeklyAttendance?.absent || [0, 0, 0, 0, 0],
            backgroundColor: '#E2E8F0',
            borderRadius: 4,
            barPercentage: 0.6
        }]
    };

    const taskCompletionData = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
            label: 'Tasks Completed',
            data: data?.taskWeeklyTrend || [0, 0, 0, 0],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2
        }]
    };

    const projectStatusData = {
        labels: data?.projectStatus?.labels || ['On Track', 'At Risk', 'Delayed'],
        datasets: [{
            data: data?.projectStatus?.data || [0, 0, 0],
            backgroundColor: ['#2563EB', '#F59E0B', '#EF4444'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    return (
        <div className="space-y-6 pb-10 bg-[#F8FAFC] min-h-screen font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div>
                    <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Team Overview</h1>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">Monitor your team's performance and workload.</p>
                </div>
                <button 
                    onClick={fetchData}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 bg-white transition-all group"
                    title="Refresh Data"
                >
                    <Clock className={clsx("w-5 h-5 transition-transform duration-500", loading && "animate-spin")} />
                </button>
            </div>

            {/* 1. KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Total Team Members" value={stats.totalEmployees || 0} trend="+1 New" icon={Users2} color="blue" onClick={() => router.push('/my-team')} />
                <KPICard title="Present Today" value={stats.presentToday || 0} trend="Normal" icon={CheckSquare} color="emerald" onClick={() => router.push('/team-attendance')} />
                <KPICard title="Absent / On Leave" value={stats.onLeaveToday || 0} trend="Daily" icon={Clock} color="amber" onClick={() => router.push('/team-attendance')} />
                <KPICard title="Late Logins" value={stats.lateLogins || 0} trend="Action Req" icon={AlertTriangle} color="rose" onClick={() => router.push('/team-attendance')} />
                <KPICard title="Active Projects" value={stats.activeProjects || 0} trend="On track" icon={Briefcase} color="blue" onClick={() => router.push('/projects')} />
                <KPICard title="Overdue Tasks" value={stats.overdueTasks || 0} trend="Critical" icon={AlertTriangle} color="rose" onClick={() => router.push('/tasks')} />
                <KPICard title="Team Productivity" value={`${stats.teamProductivity || 0}%`} trend="Overall" icon={TrendingUp} color="emerald" onClick={() => router.push('/performance')} />
                <KPICard title="Avg Task Time" value="4.2 hrs" trend="Normal" icon={Play} color="slate" onClick={() => router.push('/reports')} />
            </div>

            {/* 2. Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Weekly Attendance */}
                <div className="bg-white p-6 rounded-[8px] border border-gray-200 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[15px] font-bold text-slate-900">Weekly Attendance</h3>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => router.push('/team-attendance')}
                                className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                                <div className="w-3 h-3 rounded-sm bg-[#2563EB]"></div>
                                <span className="text-[12px] font-medium text-slate-600">Present</span>
                            </button>
                            <button 
                                onClick={() => router.push('/team-attendance')}
                                className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                                <div className="w-3 h-3 rounded-sm bg-[#E2E8F0]"></div>
                                <span className="text-[12px] font-medium text-slate-600">Absent</span>
                            </button>
                        </div>
                    </div>
                    <div className="h-[250px]">
                        <Bar
                            data={weeklyAttendanceData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { display: false }, stacked: true, ticks: { font: { size: 11, weight: 600 }, color: '#64748B' } },
                                    y: { 
                                        grid: { color: '#F8FAFC' }, 
                                        stacked: true, 
                                        beginAtZero: true, 
                                        ticks: { 
                                            font: { size: 11, weight: 600 }, 
                                            color: '#64748B', 
                                            stepSize: 2 
                                        } 
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Project Status */}
                <div className="bg-white p-6 rounded-[8px] border border-gray-200">
                    <h3 className="text-[15px] font-bold text-slate-900 mb-6">Project Status</h3>
                    <div className="h-[200px] relative">
                        <Doughnut
                            data={projectStatusData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '75%',
                                plugins: { 
                                    legend: { 
                                        position: 'bottom', 
                                        labels: { 
                                            usePointStyle: true, 
                                            padding: 20, 
                                            font: { size: 11, weight: 600 }, 
                                            color: '#475569' 
                                        } 
                                    } 
                                }
                            }}
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-4 text-center">
                            <p className="text-3xl font-extrabold text-slate-900">{stats.activeProjects}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">ACTIVE</p>
                        </div>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task Completion Trend */}
                <div className="bg-white p-6 rounded-[8px] border border-gray-200">
                    <h3 className="text-[15px] font-bold text-slate-900 mb-6">Task Completion Trend</h3>
                    <div className="h-[250px]">
                        <Line
                            data={taskCompletionData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 }, color: '#64748B' } },
                                    y: { grid: { color: '#F8FAFC' }, beginAtZero: true, ticks: { font: { size: 11, weight: 600 }, color: '#64748B' } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Quick Actions (Zoho Style) */}
                <div className="bg-white p-6 rounded-[8px] border border-gray-200 flex flex-col justify-between">
                    <div>
                        <h3 className="text-[15px] font-bold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => router.push('/daily-tasks')}
                                className="flex items-center gap-3 p-4 rounded-[6px] bg-slate-50 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 hover:text-blue-600 transition-colors text-slate-700 font-semibold text-[13px] text-left group"
                            >
                                <FileText className="w-4 h-4 text-blue-500 transition-transform" /> Assign New Task
                            </button>
                <button 
                    onClick={() => router.push('/team-attendance')}
                    className="flex items-center gap-3 p-4 rounded-[6px] bg-slate-50 border border-slate-100 hover:bg-emerald-50/50 hover:border-emerald-200 hover:text-emerald-600 transition-colors text-slate-700 font-semibold text-[13px] text-left group"
                >
                    <CheckSquare className="w-4 h-4 text-emerald-500 transition-transform" /> Auto-approve Attendance
                </button>
                            <button 
                                onClick={() => router.push('/leave-approvals')}
                                className="flex items-center gap-3 p-4 rounded-[6px] bg-slate-50 border border-slate-100 hover:bg-amber-50/50 hover:border-amber-200 hover:text-amber-600 transition-colors text-slate-700 font-semibold text-[13px] text-left group"
                            >
                                <Clock className="w-4 h-4 text-amber-500 transition-transform" /> View Pending Leaves
                            </button>
                            <button 
                                onClick={() => router.push('/meetings')}
                                className="flex items-center gap-3 p-4 rounded-[6px] bg-slate-50 border border-slate-100 hover:bg-purple-50/50 hover:border-purple-200 hover:text-purple-600 transition-colors text-slate-700 font-semibold text-[13px] text-left group"
                            >
                                <Users className="w-4 h-4 text-purple-500 transition-transform" /> Schedule Meeting
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

