"use client";

import { useState, useEffect } from "react";
import { Users, Search, Tablet, ShieldCheck, ShieldAlert, Monitor, Info, CheckCircle2, XCircle } from "lucide-react";

export default function MonitoringEmployeeDevices() {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const res = await fetch(`${COMM_URL}/api/monitoring/v2/devices/live`);
                const data = await res.json();
                if (data.success) {
                    setDevices(data.devices);
                }
            } catch (err) {
                console.error("Failed to fetch devices:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, []);

    const filteredDevices = devices.filter(d => 
        d.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.deviceName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-gray-400 animate-pulse font-medium">Scanning network for connected company devices...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600 shadow-sm border border-indigo-100">
                        <Tablet className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Managed Company Devices</h1>
                        <p className="text-gray-400 text-sm font-medium">Compliance status and device health monitoring.</p>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search employee or device ID..."
                        className="pl-12 pr-6 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 w-80 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDevices.length > 0 ? filteredDevices.map((device) => (
                    <div key={device._id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100">
                                    {device.employeeName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{device.employeeName}</h3>
                                    <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{device.metadata.os || "Corporate OS"}</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100`}>
                                <Monitor className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                                <div className="flex items-center gap-2">
                                    <Info className="w-4 h-4 text-gray-300" />
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Device ID</span>
                                </div>
                                <span className="text-xs font-black text-gray-900">{device.deviceId}</span>
                            </div>

                            <div className="flex justify-between items-center px-2">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-gray-600">Consent Accepted</span>
                                </div>
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>

                            <div className="flex justify-between items-center px-2">
                                <div className="flex items-center gap-2">
                                    <Tablet className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-gray-600">Encrypted Stream</span>
                                </div>
                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md tracking-tighter uppercase">Enabled</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Monitoring</span>
                            </div>
                            <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                                Manage Device
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-[40px]">
                        <Users className="w-16 h-16 mb-4 opacity-10" />
                        <h3 className="text-xl font-bold">No Devices Currently Connected</h3>
                        <p className="text-sm">Verify that the Employee Agent is running on the workstations.</p>
                    </div>
                )}
            </div>
            
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                <div className="space-y-1">
                    <p className="text-sm font-bold text-amber-900 leading-none">Corporate Security Policy</p>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        Devices listed here are enrolled in the **Enterprise Monitoring Program**. Unauthorized removal of the monitoring agent or tampering with OS security layers is a direct violation of IT policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
