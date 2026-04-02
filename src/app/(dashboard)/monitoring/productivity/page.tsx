"use client";

import { useState, useEffect } from "react";
import { BarChart2, Download, Table, Filter, Search, User, PieChart } from "lucide-react";
import moment from "moment";

export default function ProductivityReportPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await fetch("/api/monitoring/stats?all=true");
                const data = await res.json();
                setReports(data.reports || []);
            } catch (err) {
                console.error("Failed to fetch productivity reports:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const formatSeconds = (sec: number) => {
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Compiling Global Productivity Reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <BarChart2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Work Activity Compliance Report</h2>
                        <p className="text-gray-400 text-xs">Employee performance aggregation based on active vs. idle metrics.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee Profile</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">System Activity</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Activity Volume</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Productivity Rank</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {reports.length > 0 ? reports.map((report) => (
                            <tr key={report._id} className="hover:bg-indigo-50/20 transition-all cursor-pointer">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold">
                                            {report.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{report.user.name}</p>
                                            <p className="text-[10px] text-indigo-400 uppercase">{report.user.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-800">Clocked In: 09:00 AM</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1.5 w-48">
                                        <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                            <span>Active: {formatSeconds(report.totalActiveSeconds)}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "80%" }} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] font-bold text-gray-400">Keys</span>
                                            <span className="text-sm font-bold text-indigo-600">{report.keyboardTotal || "0"}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold">High Output</span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No global productivity records available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
