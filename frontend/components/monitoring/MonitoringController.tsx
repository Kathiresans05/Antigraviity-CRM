"use client";

import { useState, useEffect } from "react";
import { Coffee, Play, Pause, Activity, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

export default function MonitoringController() {
    const { data: session } = useSession();
    const [activeSession, setActiveSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);

    const userRole = (session?.user as any)?.role;

    const fetchSessionStatus = async () => {
        try {
            const res = await fetch("/api/monitoring/session");
            const data = await res.json();
            setActiveSession(data.activeSession);
        } catch (err) {
            console.error("Failed to fetch monitoring session:", err);
        } finally {
            setInitLoading(false);
        }
    };

    useEffect(() => {
        if (userRole === "Employee") {
            fetchSessionStatus();
            const interval = setInterval(fetchSessionStatus, 30000);
            return () => clearInterval(interval);
        } else {
            setInitLoading(false);
        }
    }, [userRole]);

    const handleToggleBreak = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const res = await fetch("/api/monitoring/session", {
                method: "POST",
                body: JSON.stringify({ action: "toggle-break" }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();

            if (data.success) {
                const isBreak = data.status === "On Break";
                toast.success(isBreak ? "Break Started" : "Work Resumed", {
                    icon: isBreak ? "☕" : "💻",
                    style: {
                        borderRadius: '12px',
                        background: '#333',
                        color: '#fff',
                    },
                });
                fetchSessionStatus();
            } else {
                toast.error(data.error || "Failed to toggle break");
            }
        } catch (err) {
            toast.error("Network error. Try again.");
        } finally {
            setLoading(false);
        }
    };

    if (userRole !== "Employee" || initLoading) return null;
    if (!activeSession) return null;

    const isOnBreak = activeSession.sessionStatus === "On Break";

    return (
        <div className="fixed bottom-6 right-6 z-[9998] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className={`p-1.5 rounded-3xl shadow-2xl flex items-center gap-3 transition-all duration-500 border ${
                isOnBreak ? 'bg-amber-500 border-amber-400 shadow-amber-500/20' : 'bg-blue-600 border-blue-500 shadow-blue-600/20'
            }`}>
                {/* Status Indicator */}
                <div className="flex items-center gap-3 px-4">
                    <div className="relative">
                        <Activity className={`w-5 h-5 text-white ${!isOnBreak ? 'animate-pulse' : 'opacity-50'}`} />
                        {!isOnBreak && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border-2 border-blue-600 animate-ping" />
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70 leading-none">
                            Monitoring
                        </p>
                        <p className="text-sm font-black text-white leading-tight">
                            {isOnBreak ? 'ON BREAK' : 'ACTIVE'}
                        </p>
                    </div>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={handleToggleBreak}
                    disabled={loading}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all active:scale-95 disabled:opacity-50 ${
                        isOnBreak 
                            ? 'bg-white text-amber-600 hover:bg-amber-50 shadow-lg shadow-amber-900/10' 
                            : 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg shadow-blue-900/10'
                    }`}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-inherit" />
                    ) : isOnBreak ? (
                        <>
                            <Play className="w-4 h-4 fill-current" />
                            Resume Work
                        </>
                    ) : (
                        <>
                            <Coffee className="w-4 h-4" />
                            Take Break
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
