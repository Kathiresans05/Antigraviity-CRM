"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export default function MonitoringHeartbeat() {
    const { data: session } = useSession();
    const intervalRef = useRef<any>(null);

    const [statusInfo, setStatusInfo] = useState<{ status: string; error: string | null }>({ status: 'unknown', error: null });
    const [showIdleWarning, setShowIdleWarning] = useState(false);

    useEffect(() => {
        if ((window.electronAPI?.monitoring as any)?.onIdleWarning) {
            (window.electronAPI.monitoring as any).onIdleWarning(() => {
                setShowIdleWarning(true);
            });
        }
    }, []);

    useEffect(() => {
        const userRole = (session?.user as any)?.role;
        const hasConsented = sessionStorage.getItem("monitoring-consent") === "true";
        
        const checkStatus = async () => {
            if (window.electronAPI?.monitoring) {
                const info = await (window.electronAPI.monitoring as any).status();
                setStatusInfo(info);
                
                // Auto-start if consented but stopped
                if (hasConsented && info.status === 'stopped' && userRole === 'Employee') {
                    await window.electronAPI.monitoring.start();
                    const updated = await (window.electronAPI.monitoring as any).status();
                    setStatusInfo(updated);
                }
            }
        };

        if (session?.user && userRole === "Employee") {
            checkStatus();
            
            const syncActivity = async () => {
                const sessionId = sessionStorage.getItem("monitoring-session-id");
                if (!sessionId) return;

                try {
                    if (window.electronAPI?.monitoring) {
                        const stats = await window.electronAPI.monitoring.flush();
                        await fetch("/api/monitoring/activity", {
                            method: "POST",
                            body: JSON.stringify({
                                sessionId,
                                keyboardCount: stats.keyboardCount,
                                mouseCount: stats.mouseCount,
                                idleSeconds: stats.idleSeconds,
                                activeSeconds: stats.activeSeconds
                            }),
                            headers: { "Content-Type": "application/json" }
                        });
                        
                        // After sync, re-verify status
                        const info = await (window.electronAPI.monitoring as any).status();
                        setStatusInfo(info);
                    }
                } catch (err) {
                    console.error("Failed to sync activity block:", err);
                }
            };

            intervalRef.current = setInterval(syncActivity, 60000); 

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [session]);

    if (showIdleWarning) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                background: '#fff7ed', // Orange-50
                borderBottom: '2px solid #f97316', // Orange-500
                padding: '20px',
                textAlign: 'center',
                zIndex: 10000,
                boxShadow: '0 4px 15px rgba(249, 115, 22, 0.2)',
                animation: 'slide-down 0.5s ease-out'
            }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#c2410c', fontWeight: 800, fontSize: '18px' }}>
                    ⚠️ Inactivity Warning
                </h3>
                <p style={{ margin: '0 0 16px 0', color: '#9a3412', fontSize: '15px', fontWeight: 500 }}>
                    You have been continuously idle for over 5 minutes. Please resume your activities.
                </p>
                <button 
                    onClick={() => setShowIdleWarning(false)}
                    style={{
                        padding: '10px 24px',
                        background: '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(249, 115, 22, 0.3)'
                    }}
                >
                    I'm Back / Resume Work
                </button>
            </div>
        );
    }

    if (statusInfo.status === 'error' || statusInfo.status === 'stopped') {
        const isEmployee = (session?.user as any)?.role === 'Employee';
        if (!isEmployee) return null;

        return (
            <div style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '12px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{ background: '#ef4444', width: 10, height: 10, borderRadius: '50%' }}></div>
                <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#991b1b', fontSize: '14px' }}>
                        Tracker {statusInfo.status === 'error' ? 'Failed' : 'Not Running'}
                    </p>
                    <p style={{ margin: 0, color: '#b91c1c', fontSize: '12px' }}>
                        {statusInfo.error || "Please run the application as Administrator."}
                    </p>
                    <button 
                        onClick={async () => {
                            if (window.electronAPI?.monitoring) {
                                await (window.electronAPI.monitoring as any).start();
                                const info = await (window.electronAPI.monitoring as any).status();
                                setStatusInfo(info);
                            }
                        }}
                        style={{
                            marginTop: '8px',
                            padding: '4px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Try Force Start
                    </button>
                </div>
            </div>
        );
    }

    return null; // Invisible component
}
