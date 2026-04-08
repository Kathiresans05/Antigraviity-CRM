"use client";

import { useState, useEffect } from "react";
import { Shield, Search, FileText, Download, Calendar, User, Clock, AlertCircle } from "lucide-react";
import moment from "moment";

export default function MonitoringAuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`${COMM_URL}/api/monitoring/v2/audit/logs`);
                const data = await res.json();
                if (data.success) {
                    setLogs(data.logs);
                }
            } catch (err) {
                console.error("Failed to fetch audit logs:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => 
        log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-gray-400 animate-pulse font-medium">Crunching security logs...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-rose-50 rounded-3xl text-rose-600 shadow-sm border border-rose-100">
                        <Shield className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Compliance Audit Logs</h1>
                        <p className="text-gray-400 text-sm font-medium">Full transparency of administrative monitoring activities.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-rose-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search logs..."
                            className="pl-12 pr-6 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-200 w-72 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Administrative Actor</th>
                                <th className="px-8 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Monitored Target</th>
                                <th className="px-8 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operation</th>
                                <th className="px-8 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Timestamp & Data</th>
                                <th className="px-8 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Declared Purpose</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-rose-50/10 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
                                                {log.adminName.charAt(0)}
                                            </div>
                                            <span className="text-sm font-bold text-gray-900">{log.adminName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4 text-gray-300" />
                                            <span className="text-sm font-semibold text-gray-600">{log.employeeName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            log.action === 'view_start' ? 'bg-indigo-50 text-indigo-600' : 
                                            log.action === 'settings_update' ? 'bg-amber-50 text-amber-600' : 
                                            'bg-gray-50 text-gray-400'
                                        }`}>
                                            {log.action.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3 text-gray-500">
                                            <Clock className="w-4 h-4 opacity-40" />
                                            <span className="text-xs font-medium tabular-nums">{moment(log.startTime).format("MMM DD, YYYY HH:mm:ss")}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 max-w-xs group-hover:bg-white transition-colors">
                                            <AlertCircle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                                            <p className="text-[11px] font-medium text-gray-500 italic leading-relaxed italic line-clamp-2">
                                                "{log.viewPurpose || "No specific purpose declared"}"
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredLogs.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center text-gray-300 gap-4">
                        <FileText className="w-20 h-20 opacity-10" />
                        <p className="text-lg font-bold">No Monitoring Events Found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
