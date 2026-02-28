"use client";

import { useState, useEffect } from "react";
import {
    Users, Briefcase, TrendingUp, Clock, CheckSquare,
    Search, Bell, Plus, ChevronDown, MoreHorizontal,
    Eye, Check, X, FileText, BarChart3, PieChart
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

// --- Sub-components ---

function KPICard({ title, value, trend, icon: Icon, color, sparklineData }: any) {
    const data = {
        labels: ["", "", "", "", "", ""],
        datasets: [{
            data: sparklineData,
            borderColor: color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'orange' ? '#f59e0b' : '#ef4444',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: false,
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
    };

    return (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx(
                    "p-2.5 rounded-xl group-hover:scale-110 transition-transform",
                    color === 'blue' ? "bg-blue-50 text-blue-600" :
                        color === 'green' ? "bg-emerald-50 text-emerald-600" :
                            color === 'orange' ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    {trend}
                </div>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 leading-none">{value}</h3>
                    <p className="text-sm font-semibold text-gray-500 mt-1">{title}</p>
                </div>
                <div className="w-16 h-8">
                    <Line data={data} options={options} />
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, string> = {
        Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
        "On Leave": "bg-amber-50 text-amber-600 border-amber-100",
        Planning: "bg-blue-50 text-blue-600 border-blue-100",
        "In Progress": "bg-indigo-50 text-indigo-600 border-indigo-100",
        Testing: "bg-purple-50 text-purple-600 border-purple-100",
        Completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Pending: "bg-amber-50 text-amber-600 border-amber-100",
        Approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Rejected: "bg-rose-50 text-rose-600 border-rose-100",
    };
    return (
        <span className={clsx(
            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border",
            cfg[status] || "bg-slate-50 text-slate-400 border-slate-100"
        )}>
            {status}
        </span>
    );
}

export default function ManagerDashboard({ session, data: initialData }: any) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(!initialData);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/dashboard/stats');
            const result = await res.json();
            if (result.stats) {
                setData(result);
            }
        } catch (err) {
            console.error("Failed to fetch real-time stats:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOnboardingAction = async (userId: string, status: 'Approved' | 'Rejected') => {
        try {
            await axios.patch("/api/onboarding/approve", { userId, approvalType: 'manager', status });
            toast.success(`Onboarding ${status.toLowerCase()} successfully`);
            setData((prev: any) => ({
                ...prev,
                tables: {
                    ...prev.tables,
                    onboardingApprovals: prev.tables.onboardingApprovals.filter((oa: any) => oa.id !== userId)
                },
                stats: {
                    ...prev.stats,
                    pendingOnboarding: Math.max(0, prev.stats.pendingOnboarding - 1)
                }
            }));
        } catch (err) {
            console.error(`Failed to ${status} onboarding:`, err);
            toast.error(`Failed to ${status} onboarding.`);
        }
    };

    const handleLeaveAction = async (leaveId: string, status: 'Approved' | 'Rejected') => {
        try {
            await axios.patch("/api/leave", { leaveId, status });
            toast.success(`Leave ${status.toLowerCase()} successfully`);
            setData((prev: any) => ({
                ...prev,
                tables: {
                    ...prev.tables,
                    leaveRequests: prev.tables.leaveRequests.filter((l: any) => l.id !== leaveId)
                },
                stats: {
                    ...prev.stats,
                    pendingLeaves: Math.max(0, prev.stats.pendingLeaves - 1)
                }
            }));
        } catch (err) {
            console.error(`Failed to ${status} leave:`, err);
            toast.error(`Failed to ${status} leave.`);
        }
    };

    useEffect(() => {
        // Initial fetch if no data provided
        if (!initialData) {
            fetchData();
        }

        // Setup "real-time" polling every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [initialData]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const stats = data?.stats || {};
    const charts = data?.charts || {};
    const tables = data?.tables || {};

    return (
        <div className="space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
            {/* 1. Header & Top Bar */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                    <p className="text-sm font-medium text-gray-500">Welcome back, {session?.user?.name || 'Manager'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Live Updates</span>
                    </div>
                </div>
            </div>

            {/* 2. KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard title="Team size" value={stats.totalEmployees || 0} trend="12%" icon={Users} color="blue" sparklineData={[30, 45, 35, 60, 50, 80]} />
                <KPICard title="Active Projects" value={stats.activeProjects || 0} trend="8%" icon={Briefcase} color="green" sparklineData={[40, 30, 55, 45, 70, 65]} />
                <KPICard title="Pending Tasks" value={stats.pendingTasks || 0} trend="5%" icon={Clock} color="orange" sparklineData={[20, 40, 30, 50, 45, 60]} />
                <KPICard title="Leave Requests" value={stats.pendingLeaves || 0} trend="2%" icon={FileText} color="blue" sparklineData={[10, 20, 15, 25, 20, 35]} />
                <KPICard title="Attendance %" value={`${stats.teamAttendanceRate || 0}%`} trend="4%" icon={CheckSquare} color="green" sparklineData={[85, 90, 88, 92, 94, 96]} />
                <KPICard title="Completion" value={`${stats.projectCompletionRate || 0}%`} trend="15%" icon={TrendingUp} color="purple" sparklineData={[60, 70, 65, 75, 80, 82]} />
            </div>

            {/* 3. Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Team Distribution</h3>
                    </div>
                    <div className="h-[250px]">
                        <Bar
                            data={{
                                labels: charts.departments?.labels || [],
                                datasets: [{
                                    data: charts.departments?.data || [],
                                    backgroundColor: '#3b82f6',
                                    borderRadius: 6,
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                                    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 'bold' } } }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Performance Trend</h3>
                    </div>
                    <div className="h-[250px]">
                        <Line
                            data={{
                                labels: charts.performanceTrend?.labels || [],
                                datasets: [{
                                    data: charts.performanceTrend?.data || [],
                                    borderColor: '#6366f1',
                                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 4,
                                    pointBackgroundColor: '#fff',
                                    pointBorderWidth: 2,
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                                    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 'bold' } } }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 4. Team Members & Leave Approvals Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Team Members</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50">
                                <tr className="text-left">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completion</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(tables.employeeSnapshot || []).map((emp: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-gray-600 text-[10px]">
                                                    {(emp.name || 'User').split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{emp.name}</p>
                                                    <p className="text-[11px] font-medium text-gray-500">{emp.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-700">{emp.tasks}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-blue-500 h-1.5" style={{ width: `${emp.completion}%` }}></div>
                                                </div>
                                                <span className="text-[11px] font-bold text-gray-700">{emp.completion}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={emp.status} />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Upcoming Joinees</h3>
                        <span className="bg-blue-50 text-[#1f6f8b] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{stats.pendingOnboarding || 0} New</span>
                    </div>
                    <div className="p-5 space-y-4 overflow-y-auto">
                        {(tables.onboardingApprovals || []).length > 0 ? (tables.onboardingApprovals || []).map((oa: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-50 bg-gray-50/30">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{oa.name}</p>
                                        <p className="text-[11px] font-bold text-[#1f6f8b] mt-0.5">{oa.role} • {oa.dept}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 bg-white border border-gray-100 rounded-lg shadow-sm">{oa.date}</span>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => handleOnboardingAction(oa.id, 'Approved')}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 text-center"
                                    >
                                        <Check className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleOnboardingAction(oa.id, 'Rejected')}
                                        className="flex-1 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-center"
                                    >
                                        <X className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                <Users className="w-8 h-8 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">No pending approvals</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Leave Approvals</h3>
                        <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{stats.pendingLeaves} Pending</span>
                    </div>
                    <div className="p-5 space-y-4 overflow-y-auto">
                        {(tables.leaveRequests || []).length > 0 ? (tables.leaveRequests || []).map((req: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-50 bg-gray-50/30">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{req.name}</p>
                                        <p className="text-[11px] font-bold text-blue-600 mt-0.5">{req.type}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 bg-white border border-gray-100 rounded-lg shadow-sm">{req.date}</span>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed mb-4 italic">"{req.reason}"</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleLeaveAction(req.id, 'Approved')}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 text-center"
                                    >
                                        <Check className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleLeaveAction(req.id, 'Rejected')}
                                        className="flex-1 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-center"
                                    >
                                        <X className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                <FileText className="w-8 h-8 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">No pending leaves</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. Project Monitoring Section */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Project Monitoring</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#f8fafc]">
                            <tr className="text-left">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deadline</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(tables.projects || []).map((proj: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-sm text-gray-900">{proj.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {proj.endDate}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(j => (
                                                <div key={j} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">U</div>
                                            ))}
                                            <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[8px] font-bold text-blue-600">+{proj.team || 0}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={proj.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <div className={clsx("h-2 rounded-full", "bg-blue-500")} style={{ width: `${proj.progress}%` }}></div>
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-700">{proj.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

