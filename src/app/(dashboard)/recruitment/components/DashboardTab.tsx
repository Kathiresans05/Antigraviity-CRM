"use client";

import { Users, Briefcase, Clock, UserCheck, TrendingUp, Activity } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import clsx from "clsx";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-xl", color)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
                <p className="text-sm font-semibold text-gray-500">{title}</p>
                <p className="text-xs font-medium text-gray-400 mt-1">{subtitle}</p>
            </div>
        </div>
    );
}

export default function DashboardTab({ stats }: { stats: any }) {
    if (!stats) return <div className="text-center py-10">Loading KPI Data...</div>;

    const funnelData = {
        labels: ['Applied', 'Screening', 'Interview 1', 'Interview 2', 'HR Round', 'Offered', 'Hired'],
        datasets: [{
            label: 'Candidates',
            data: [
                stats.funnelCounts?.['Applied'] || 0,
                stats.funnelCounts?.['Screening'] || 0,
                stats.funnelCounts?.['Interview Round 1'] || 0,
                stats.funnelCounts?.['Interview Round 2'] || 0,
                stats.funnelCounts?.['HR Round'] || 0,
                stats.funnelCounts?.['Offered'] || 0,
                stats.funnelCounts?.['Hired'] || 0,
            ],
            backgroundColor: 'rgba(37, 99, 235, 0.8)',
            borderRadius: 6,
        }]
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard title="Active Openings" value={stats.kpis?.activeOpenings || 0} subtitle="Currently hiring" icon={Briefcase} color="bg-blue-50 text-blue-600" />
                <StatCard title="Total Applicants" value={stats.kpis?.totalApplicants || 0} subtitle="All time pipeline" icon={Users} color="bg-purple-50 text-purple-600" />
                <StatCard title="Interviews Today" value={stats.kpis?.interviewsToday || 0} subtitle="Active rounds" icon={Clock} color="bg-amber-50 text-amber-600" />
                <StatCard title="Hired This Month" value={stats.kpis?.hiredThisMonth || 0} subtitle="Successful onboardings" icon={UserCheck} color="bg-emerald-50 text-emerald-600" />
                <StatCard title="Offer Acceptance" value={`${stats.kpis?.offerAcceptanceRate || 0}%`} subtitle="Accepted offers" icon={TrendingUp} color="bg-indigo-50 text-indigo-600" />
                <StatCard title="Time to Hire" value={`${stats.kpis?.avgTimeToHire || 0}d`} subtitle="Average days" icon={Activity} color="bg-rose-50 text-rose-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Recruitment Funnel</h3>
                    <div className="h-[250px]">
                        <Bar data={funnelData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                <div className="bg-[#1f2937] p-6 rounded-2xl shadow-lg text-white">
                    <h3 className="text-lg font-bold mb-6">Active Departments</h3>
                    <div className="space-y-4">
                        {(stats.deptBreakdown || []).map((d: any, i: number) => (
                            <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-bold text-sm">{d.dept}</p>
                                    <span className="text-xs font-bold text-blue-400">{d.count} candidates</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-1.5">
                                    <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, (d.count / Math.max(1, stats.kpis?.totalApplicants)) * 100 * 2)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
