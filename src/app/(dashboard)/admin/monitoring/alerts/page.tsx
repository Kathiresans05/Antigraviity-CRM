"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Clock, ShieldAlert, Monitor, CheckCircle2, MoreVertical, Search, Filter } from "lucide-react";
import clsx from "clsx";

export default function MonitoringAlertsPage() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${COMM_URL}/api/monitoring/alerts`);
            const data = await res.json();
            if (data.success) {
                setAlerts(data.alerts || []);
            }
        } catch (err) {
            console.error("Failed to fetch alerts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const filteredAlerts = alerts.filter(a => filterType === 'all' || a.type === filterType);

    if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse font-bold tracking-widest">Listening for System Anomalies...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 shadow-sm shadow-rose-100">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Security & Activity Alerts</h2>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 shrink-0">Automated Violation Log</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        {['all', 'idle', 'blocked_app'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={clsx(
                                    "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    filterType === type 
                                        ? "bg-white text-indigo-600 shadow-sm border border-indigo-50" 
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Recent Incident Report</h3>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest tabular-nums">{filteredAlerts.length} Total Incidents</span>
                </div>
                
                <div className="divide-y divide-gray-50">
                    {filteredAlerts.length > 0 ? filteredAlerts.map((alert) => (
                        <div key={alert._id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className={clsx(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-6 shadow-sm",
                                    alert.severity === 'high' ? "bg-rose-50 text-rose-600" :
                                    alert.severity === 'medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                )}>
                                    {alert.type === 'idle' ? <Clock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-sm font-black text-gray-900 leading-none">{alert.employeeName}</h4>
                                        <span className={clsx(
                                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                                            alert.severity === 'high' ? "bg-rose-100 text-rose-700" :
                                            alert.severity === 'medium' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {alert.severity} Priority
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 mr-12">{alert.message}</p>
                                    <p className="text-[10px] font-bold text-gray-300 tabular-nums uppercase tracking-widest">
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Acknowledge
                                </button>
                                <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="p-20 text-center flex flex-col items-center justify-center text-gray-400">
                             <CheckCircle2 className="w-12 h-12 mb-4 text-emerald-500/20" />
                             <p className="font-black uppercase tracking-[0.2em] text-xs">No active alerts found.</p>
                             <p className="text-[10px] font-bold text-gray-300 mt-2">All system parameters are within normal range.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
