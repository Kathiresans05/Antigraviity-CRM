"use client";

import { useState, useEffect } from "react";
import { Users, Activity, Clock, Timer, AlertTriangle, Search, Filter } from "lucide-react";
import ActivitySparkline from "./ActivitySparkline";

export default function TeamActivityPage() {
    const [teamData, setTeamData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchTeamStats = async () => {
            try {
                const res = await fetch("/api/monitoring/stats?team=true");
                const data = await res.json();
                setTeamData(data.teamRecords || []);
            } catch (err) {
                console.error("Failed to fetch team monitoring stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamStats();
        const interval = setInterval(fetchTeamStats, 30000); // 30s refresh for better real-time feel
        return () => clearInterval(interval);
    }, []);

    const formatSeconds = (sec: number) => {
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const filteredTeam = teamData.filter(m => 
        m.user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Aggregating Team Productivity Data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Team Activity Monitoring</h2>
                        <p className="text-gray-400 text-xs">Real-time productivity overview of your direct reports.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search team..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Session Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Active Today</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Idle Today</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Activity Trends (Last 12 Min)</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Alerts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTeam.length > 0 ? filteredTeam.map((member) => (
                            <tr key={member.user._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                            {member.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{member.user.name}</p>
                                            <p className="text-xs text-gray-400 uppercase">{member.user.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                                        member.session.sessionStatus === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full ${
                                            member.session.sessionStatus === "Active" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                                        }`} />
                                        {member.session.sessionStatus}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-gray-800">{formatSeconds(member.session.totalActiveSeconds)}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-gray-800">{formatSeconds(member.session.totalIdleSeconds)}</p>
                                </td>
                                <td className="px-6 py-4 min-w-[200px]">
                                    <div className="flex items-center justify-between gap-6">
                                        {/* KB Trend */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] uppercase font-bold text-gray-400">Keys</span>
                                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-1 rounded">
                                                    last 1m: {member.activity.recentBlocks?.[member.activity.recentBlocks.length - 1]?.keyboard || 0}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <ActivitySparkline 
                                                    data={member.activity.recentBlocks?.map((b: any) => b.keyboard) || []} 
                                                    color="#2563eb" 
                                                />
                                                <span className="text-[10px] font-bold text-gray-500">
                                                    total: {member.activity.keyboardTotal}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Mouse Trend */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] uppercase font-bold text-gray-400">Mouse</span>
                                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-1 rounded">
                                                    last 1m: {member.activity.recentBlocks?.[member.activity.recentBlocks.length - 1]?.mouse || 0}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <ActivitySparkline 
                                                    data={member.activity.recentBlocks?.map((b: any) => b.mouse) || []} 
                                                    color="#10b981" 
                                                />
                                                <span className="text-[10px] font-bold text-gray-500">
                                                    total: {member.activity.mouseTotal}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {member.session.totalIdleSeconds > 3600 ? (
                                        <div className="inline-flex items-center gap-1.5 text-amber-600">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">High Idle</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">--</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No team activity data found for today.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
