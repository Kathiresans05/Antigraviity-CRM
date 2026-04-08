"use client";

import { useState, useEffect } from "react";
import { Activity, Users, Clock, AlertCircle, TrendingUp, Monitor } from "lucide-react";

export default function MonitoringOverview() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${COMM_URL}/api/monitoring/stats`);
                const data = await res.json();
                if (data.success) {
                    // Express backend returns { success: true, stats: [...] }
                    setStats(data.stats);
                }
            } catch (err) {
                console.error("Failed to fetch monitoring stats:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const totalStats = stats || [];
    const kpis = [
        { label: "Active Employees", value: totalStats.filter((s:any) => s.totalActiveSeconds > 0).length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Idle Employees", value: totalStats.filter((s:any) => s.totalIdleSeconds > 3600).length || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Total Work Hours", value: `${Math.round((totalStats.reduce((acc:any, s:any) => acc + s.totalActiveSeconds, 0) || 0) / 3600)}h`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Critical Alerts", value: 0, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
    ];

    if (loading) return <div className="p-8 text-gray-400 animate-pulse font-medium">Loading Monitoring Intelligence...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                    <Monitor className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monitoring Overview</h1>
                    <p className="text-gray-500 text-sm">System-wide productivity and activity analytics.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                <kpi.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live</span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 mb-1">{kpi.value}</h3>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{kpi.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Active Applications</h3>
                    <div className="space-y-4">
                        {stats?.slice(0, 5).map((s:any, i:number) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-500">
                                        {i + 1}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">{s.lastActiveApp || "Unknown"}</span>
                                </div>
                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                    {Math.round(s.totalActiveSeconds / 60)}m
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Alerts</h3>
                    <div className="flex flex-col items-center justify-center h-48 text-gray-300 italic text-sm">
                        No critical alerts in the last 24 hours.
                    </div>
                </div>
            </div>
        </div>
    );
}
