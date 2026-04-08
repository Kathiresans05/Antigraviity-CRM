"use client";

import { useState, useEffect } from "react";
import { Users, Activity, Clock, Monitor, Search, RefreshCw } from "lucide-react";
import clsx from "clsx";

export default function LiveMonitoringPage() {
    const [teamData, setTeamData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    const fetchLiveStats = async () => {
        try {
            const res = await fetch(`${COMM_URL}/api/monitoring/stats`);
            const data = await res.json();
            if (data.success) {
                setTeamData(data.stats || []);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Failed to fetch live monitoring data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveStats();
        const interval = setInterval(fetchLiveStats, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const formatSeconds = (sec: number) => {
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    if (loading) return <div className="p-8 text-gray-400 animate-pulse font-medium underline decoration-indigo-500/20 underline-offset-4 decoration-2">Connecting to Live Monitoring Gateway...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Live Activity Monitor</h2>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">Real-time Workforce Presence</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Updated</p>
                        <p className="text-sm font-black text-indigo-600">{lastUpdated.toLocaleTimeString()}</p>
                    </div>
                    <button 
                        onClick={() => { setLoading(true); fetchLiveStats(); }}
                        className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                        <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Employee</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Current Active App</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Window Title</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Today</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Idle Time</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {teamData.length > 0 ? teamData.map((member) => (
                            <tr key={member._id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-white text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-50 shadow-sm transition-all group-hover:from-indigo-600 group-hover:to-indigo-700 group-hover:text-white group-hover:rotate-3">
                                            {member.employeeName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-all">{member.employeeName}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee-ID: {member._id.slice(-6)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <Monitor className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-900">{member.lastActiveApp || "Unknown"}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 max-w-xs overflow-hidden">
                                    <p className="text-xs font-medium text-gray-500 truncate" title={member.lastWindowTitle}>{member.lastWindowTitle || "No active window"}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-sm font-black text-gray-700">{formatSeconds(member.totalActiveSeconds)}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={clsx("text-sm font-black", member.totalIdleSeconds > 3600 ? "text-rose-600" : "text-gray-400")}>
                                        {formatSeconds(member.totalIdleSeconds)}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className={clsx(
                                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                                        (new Date().getTime() - new Date(member.lastSeen).getTime() < 120000)
                                            ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                                            : "bg-gray-100 text-gray-400"
                                    )}>
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full",
                                            (new Date().getTime() - new Date(member.lastSeen).getTime() < 120000) ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                                        )} />
                                        {(new Date().getTime() - new Date(member.lastSeen).getTime() < 120000) ? "Connected" : "Offline"}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center text-gray-400 italic font-medium tracking-tight">No live monitoring snapshots found for the current period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
