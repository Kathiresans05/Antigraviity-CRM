"use client";

import { useState, useEffect } from "react";
import { BarChart2, Calendar, FileText, Download, Filter, TrendingUp, Clock, Activity, Monitor } from "lucide-react";
import clsx from "clsx";

export default function MonitoringReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('daily');

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    const fetchReports = async () => {
        try {
            const res = await fetch(`${COMM_URL}/api/monitoring/stats?days=${timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30}`);
            const data = await res.json();
            if (data.success) {
                setReports(data.stats || []);
            }
        } catch (err) {
            console.error("Failed to fetch reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [timeframe]);

    const formatSeconds = (sec: number) => {
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse font-bold tracking-widest">Aggregating Global Productivity Matrix...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-5">
                    <div className="p-5 bg-emerald-50 rounded-3xl text-emerald-600 shadow-sm shadow-emerald-100">
                        <BarChart2 className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Productivity Intelligence</h2>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 shrink-0">Historical Performance Analytics</p>
                    </div>
                </div>

                <div className="flex bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    {['daily', 'weekly', 'monthly'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={clsx(
                                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                timeframe === t 
                                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" 
                                    : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <FileText className="w-6 h-6 text-indigo-600" />
                            <h3 className="text-lg font-black text-gray-900 tracking-tight underline decoration-indigo-500/20 decoration-4 underline-offset-8">Activity Summary</h3>
                        </div>
                        <button className="flex items-center gap-3 px-6 py-3 bg-gray-50 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>

                    <div className="p-2 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-50/50">
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">Employee</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">Active Time</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">Idle Time</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">Avg Activity</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">Core Application</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-300 uppercase tracking-widest text-right">Trend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50/50">
                                {reports.length > 0 ? reports.map((rpt, i) => (
                                    <tr key={rpt._id} className="hover:bg-gray-50/30 transition-all font-medium">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4 text-sm font-black text-gray-900">
                                                <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-xs text-gray-400 border border-gray-100">
                                                    {i + 1}
                                                </div>
                                                {rpt.employeeName}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-indigo-600 tabular-nums">
                                            {formatSeconds(rpt.totalActiveSeconds)}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-gray-400 tabular-nums">
                                            {formatSeconds(rpt.totalIdleSeconds)}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">K: {Math.round(rpt.avgKeystrokes)}</span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">M: {Math.round(rpt.avgMouseClicks)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                    {rpt.lastActiveApp || "Various"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <TrendingUp className="w-5 h-5 text-emerald-500 ml-auto opacity-50" />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center text-gray-400 italic">No historical data available for the selected timeframe.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
