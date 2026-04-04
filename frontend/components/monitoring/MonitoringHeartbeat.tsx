"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export default function MonitoringHeartbeat() {
    const { data: session } = useSession();
    const intervalRef = useRef<any>(null);

    const [statusInfo, setStatusInfo] = useState<{ status: string; error: string | null }>({ status: 'unknown', error: null });

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
                </div>
            </div>
        );
    }

    return null; // Invisible component
}
