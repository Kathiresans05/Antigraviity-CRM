"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Monitor, Users, Clock, AlertCircle, Maximize2, Shield, Search, Grid, Eye, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import moment from "moment";

interface EmployeeFrame {
    userId: string;
    employeeName: string;
    frame: string; // Base64
    activeApp: string;
    lastSeen: number;
}

export default function LiveMonitoringWall() {
    const [streams, setStreams] = useState<Record<string, EmployeeFrame>>({});
    const [gridSize, setGridSize] = useState(3); // 3x3 default
    const [searchTerm, setSearchTerm] = useState("");
    
    // States for Audited viewing
    const [selectedStream, setSelectedStream] = useState<EmployeeFrame | null>(null);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditReason, setAuditReason] = useState("");
    const [isViewingDetail, setIsViewingDetail] = useState(false);
    const [activeAuditLogId, setActiveAuditLogId] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    const handleAccessStream = async () => {
        if (!selectedStream || !auditReason.trim()) return;

        try {
            // 1. Create Audit Log Entry
            const res = await fetch(`${COMM_URL}/api/monitoring/v2/audit/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: "ADMIN-001", // In production, get from session
                    adminName: "Administrator",
                    employeeId: selectedStream.userId,
                    employeeName: selectedStream.employeeName,
                    action: "view_start",
                    viewPurpose: auditReason
                })
            });
            const data = await res.json();
            if (data.success) {
                setActiveAuditLogId(data.logId);
                setShowAuditModal(false);
                setIsViewingDetail(true);
            }
        } catch (err) {
            console.error("Audit log failed:", err);
        }
    };

    const handleStopViewing = async () => {
        if (activeAuditLogId) {
            try {
                await fetch(`${COMM_URL}/api/monitoring/v2/audit/stop/${activeAuditLogId}`, {
                    method: 'PATCH'
                });
            } catch (err) {
                console.error("Failed to close audit log:", err);
            }
        }
        setIsViewingDetail(false);
        setSelectedStream(null);
        setAuditReason("");
        setActiveAuditLogId(null);
    };

    useEffect(() => {
        // Connect to the monitoring namespace
        const socket = io(`${COMM_URL}/monitoring`);
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to Monitoring Signaling Server");
            socket.emit("join-admin");
        });

        socket.on("screen-update", (data: any) => {
            setStreams(prev => ({
                ...prev,
                [data.userId]: {
                    ...prev[data.userId],
                    ...data,
                    lastSeen: Date.now()
                }
            }));
        });

        socket.on("agent-status-change", (data: any) => {
            if (data.status === "offline") {
                // Handle offline status if needed
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [COMM_URL]);

    const filteredStreams = Object.values(streams).filter(s => 
        s.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header section with KPIs and Controls */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                        <Monitor className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Live Monitoring Wall</h1>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">CCTV Control Room • Real-time Compliance</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Find employee..."
                            className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                        {[2, 3, 4].map(size => (
                            <button 
                                key={size}
                                onClick={() => setGridSize(size)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gridSize === size ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}
                            >
                                {size}x{size}
                            </button>
                        ))}
                    </div>

                    <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 border border-emerald-100">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider">{filteredStreams.length} Connected</span>
                    </div>
                </div>
            </div>

            {/* Grid Layout */}
            <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {filteredStreams.length > 0 ? filteredStreams.map((stream) => (
                    <div key={stream.userId} className="group bg-white rounded-3xl p-3 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                        {/* Stream Frame */}
                        <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden relative border border-gray-800">
                            {stream.frame ? (
                                <img 
                                    src={`data:image/jpeg;base64,${stream.frame}`} 
                                    alt={stream.employeeName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
                                    <Clock className="w-8 h-8 animate-spin-slow" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Waiting for Signal</span>
                                </div>
                            )}
                            
                            {/* Overlay info */}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                                <div className="px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[9px] text-white font-medium flex items-center gap-1.5">
                                    <Shield className="w-3 h-3 text-indigo-400" />
                                    <span>{stream.activeApp || "Inactive"}</span>
                                </div>
                                <div className="px-2 py-1 bg-indigo-600/80 backdrop-blur-md rounded-lg text-[9px] text-white font-bold">
                                    LIVE
                                </div>
                            </div>
                        </div>

                        {/* Employee Footer */}
                        <div className="mt-3 px-1 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{stream.employeeName}</h3>
                                <p className="text-[10px] text-gray-400 font-medium">ID: {stream.userId.slice(-6).toUpperCase()}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedStream(stream);
                                    setShowAuditModal(true);
                                }}
                                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-[40px]">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-bold">No Active Monitoring Streams</h3>
                        <p className="text-sm">Connect an employee device to start live visualization.</p>
                    </div>
                )}
            </div>

            {/* Audit Reason Modal */}
            {showAuditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md">
                    <div className="bg-white rounded-[48px] p-10 max-w-lg w-full shadow-2xl space-y-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
                                <Shield className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">Compliance Verification</h2>
                                <p className="text-gray-400 text-sm font-medium">Accessing {selectedStream?.employeeName}'s live stream.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Monitoring Purpose (Mandatory)</label>
                            <textarea 
                                className="w-full bg-gray-50 border-none rounded-3xl p-5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-200 min-h-[120px] resize-none"
                                placeholder="Enter specific reason for monitoring (e.g., Performance Review, Security Audit, Training)..."
                                value={auditReason}
                                onChange={(e) => setAuditReason(e.target.value)}
                            />
                        </div>

                        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                                <span className="font-bold">Privacy Notice:</span> This access is being logged to the permanent audit trail. Your identity, IP address, and duration of viewing will be visible to the HR Compliance department.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <button 
                                onClick={() => setShowAuditModal(false)}
                                className="px-8 py-4 bg-gray-50 text-gray-400 rounded-3xl font-bold text-sm tracking-tight hover:bg-gray-100 transition-all grow"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={!auditReason.trim()}
                                onClick={handleAccessStream}
                                className="px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-sm tracking-tight hover:bg-indigo-700 transition-all grow shadow-xl shadow-indigo-100 disabled:opacity-50"
                            >
                                Confirm & View Stream
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Stream Overlay */}
            {isViewingDetail && selectedStream && (
                <div className="fixed inset-0 z-[110] bg-gray-900 flex flex-col p-8 space-y-6 overflow-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                                {selectedStream.employeeName.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">{selectedStream.employeeName}</h2>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Live Desktop Stream</span>
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={handleStopViewing}
                            className="px-8 py-4 bg-rose-600 text-white rounded-3xl font-black text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20"
                        >
                            Terminate Session
                        </button>
                    </div>

                    <div className="grow bg-black rounded-[48px] overflow-hidden relative border border-white/5 shadow-2xl">
                        <img 
                            src={`data:image/jpeg;base64,${selectedStream.frame}`} 
                            alt="Full Stream"
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute top-8 right-8 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                            <Clock className="w-4 h-4 text-indigo-300" />
                            <span className="text-xs font-black text-white tabular-nums tracking-widest uppercase">Encryption Active</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Compliance Footer */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600" />
                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                    <span className="font-bold">Compliance Reminder:</span> All monitoring sessions are audited. Unauthorized viewing of employee screens without an active work purpose is strictly prohibited and logged for HR review.
                </p>
            </div>
        </div>
    );
}
