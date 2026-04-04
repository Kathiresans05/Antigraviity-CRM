"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, MousePointer2, Keyboard, Timer, BarChart3, Activity } from "lucide-react";
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

interface EmployeeActivityModalProps {
    user: { id: string, name: string } | null;
    onClose: () => void;
}

export default function EmployeeActivityModal({ user, onClose }: EmployeeActivityModalProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/monitoring/stats?userId=${user.id}`);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch employee monitoring stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    if (!user) return null;

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
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderRadius: 4,
            },
            {
                label: "Mouse Actions",
                data: stats?.blocks?.map((b: any) => b.mouseCount) || [],
                backgroundColor: "rgba(16, 185, 129, 0.7)",
                borderRadius: 4,
            }
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: "top" as const, labels: { boxWidth: 12, usePointStyle: true } },
            tooltip: { mode: "index" as const, intersect: false },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { stepSize: 50 } },
            x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } },
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-600/20">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                            <p className="text-gray-400 text-sm">Detailed Activity Report - Today</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {loading ? (
                        <div className="h-[400px] flex items-center justify-center text-gray-400 animate-pulse font-medium">
                            Synthesizing Activity Timeline...
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center gap-4">
                                    <Clock className="w-6 h-6 text-blue-600" />
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">Logged In</p>
                                        <p className="text-lg font-black text-gray-900 leading-none">
                                            {stats?.summary?.loginTime ? moment(stats.summary.loginTime).format("HH:mm A") : "--:--"}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-center gap-4">
                                    <Timer className="w-6 h-6 text-emerald-600" />
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5">Active</p>
                                        <p className="text-lg font-black text-gray-900 leading-none">
                                            {formatSeconds(stats?.summary?.totalActiveSeconds || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex items-center gap-4">
                                    <BarChart3 className="w-6 h-6 text-amber-600" />
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-amber-600 mb-0.5">Idle</p>
                                        <p className="text-lg font-black text-gray-900 leading-none">
                                            {formatSeconds(stats?.summary?.totalIdleSeconds || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 font-bold text-sm text-gray-400 capitalize">
                                    <Activity className="w-6 h-6" />
                                    {stats?.summary?.sessionStatus || "Inactive"}
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
                                        <Activity className="w-6 h-6 text-blue-600" />
                                        Activity Timeline (Today)
                                    </h3>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase">
                                            <Keyboard className="w-4 h-4 text-blue-500" /> Keyboard
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase">
                                            <MousePointer2 className="w-4 h-4 text-emerald-500" /> Mouse
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="h-[400px]">
                                    <Bar data={chartData} options={chartOptions} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                        Antigraviity Monitoring Core v1.2.0
                    </p>
                </div>
            </div>
        </div>
    );
}
