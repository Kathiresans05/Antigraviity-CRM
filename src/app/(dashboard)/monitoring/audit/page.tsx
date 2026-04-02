"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, User, History, Search, Filter, Info, ChevronRight } from "lucide-react";
import moment from "moment";

export default function MonitoringAuditPage() {
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                const res = await fetch("/api/monitoring/stats?audit=true");
                const data = await res.json();
                setAuditLogs(data.auditLogs || []);
            } catch (err) {
                console.error("Failed to fetch audit logs:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAudit();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Retrieving Compliance Audit Logs...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Governance Audit Trail</h2>
                        <p className="text-gray-400 text-xs tracking-tight">Security log of all monitoring-related administrative actions.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search audit trail..."
                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Administrator</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Action Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Target</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {auditLogs.length > 0 ? auditLogs.map((log) => (
                            <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900">{moment(log.createdAt).format("DD MMM YYYY")}</span>
                                        <span className="text-xs text-gray-400">{moment(log.createdAt).format("HH:mm:ss A")}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-gray-800 uppercase tracking-wider text-[11px]">{log.actorRole}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                        log.actionType.includes("Update") ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                                    }`}>
                                        {log.actionType}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                     <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-lg">
                                        <History className="w-3.5 h-3.5" />
                                        {log.targetModule}
                                     </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No administrative audit logs recorded.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                <Info className="w-5 h-5" />
                <p className="text-xs font-bold uppercase tracking-wider">System Governance Enabled: Logs are immutable and retained for 180 days.</p>
            </div>
        </div>
    );
}
