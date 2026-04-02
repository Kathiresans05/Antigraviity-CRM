"use client";

import { useState, useEffect } from "react";
import { Clock, MousePointer2, Keyboard, Timer, BarChart3, Activity } from "lucide-react";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from "chart.js";
import { Bar } from "react-chartjs-2";
import moment from "moment";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function MyActivityPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/monitoring/stats");
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch monitoring stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000); // 1-minute auto-refresh
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Analyzing Session Activity...</div>;

    const formatSeconds = (sec: number) => {
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const chartData = {
        labels: stats?.blocks?.map((b: any) => moment(b.blockStart).format("HH:mm")) || [],
        datasets: [
            {
                label: "Keyboard Actions",
                data: stats?.blocks?.map((b: any) => b.keyboardCount) || [],
                backgroundColor: "rgba(59, 130, 246, 0.6)", // Tailwind Blue
                borderColor: "rgb(59, 130, 246)",
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: "Mouse Actions",
                data: stats?.blocks?.map((b: any) => b.mouseCount) || [],
                backgroundColor: "rgba(16, 185, 129, 0.6)", // Tailwind Emerald
                borderColor: "rgb(16, 185, 129)",
                borderWidth: 1,
                borderRadius: 4,
            }
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: "top" as const },
            tooltip: { mode: "index" as const, intersect: false },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
            x: { grid: { display: false } },
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Start Time</p>
                        <p className="text-lg font-bold text-gray-900">{stats?.summary?.loginTime ? moment(stats.summary.loginTime).format("HH:mm A") : "--:--"}</p>
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <Timer className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Active Duration</p>
                        <p className="text-lg font-bold text-gray-900">{formatSeconds(stats?.summary?.totalActiveSeconds || 0)}</p>
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Current Status</p>
                        <p className="text-lg font-bold text-gray-900">{stats?.summary?.sessionStatus || "Inactive"}</p>
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Idle Today</p>
                        <p className="text-lg font-bold text-gray-900">{formatSeconds(stats?.summary?.totalIdleSeconds || 0)}</p>
                    </div>
                </div>
            </div>

            {/* Timeline Statistics */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
                        <Activity className="w-6 h-6 text-blue-600" />
                        Activity Timeline (Today)
                    </h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <Keyboard className="w-4 h-4 text-blue-500" /> Keyboard Count
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <MousePointer2 className="w-4 h-4 text-emerald-500" /> Mouse Count
                        </div>
                    </div>
                </div>
                
                <div className="h-[400px]">
                    <Bar data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Activity Disclosure Footer */}
            <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-400 text-[11px] leading-relaxed">
                    Privacy Protection: Only event counts are recorded. Content, typed keys, screens, and personal history are never captured. 
                    Monitoring is active only during office session.
                </p>
            </div>
        </div>
    );
}
