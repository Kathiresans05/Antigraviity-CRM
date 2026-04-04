"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function MonitoringHeartbeat() {
    const { data: session } = useSession();
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        const userRole = (session?.user as any)?.role;
        
        // Heartbeat only for Employees
        if (session?.user && userRole === "Employee") {
            const syncActivity = async () => {
                const sessionId = sessionStorage.getItem("monitoring-session-id");
                if (!sessionId) return;

                try {
                    // 1. Pull and Reset from Electron
                    if (window.electronAPI?.monitoring) {
                        const stats = await window.electronAPI.monitoring.flush();
                        
                        // 2. Push to Backend (Send even if counts are 0, to track idle time)
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
                        console.log("[Monitoring] Heartbeat synced:", stats);
                    }
                } catch (err) {
                    console.error("Failed to sync activity block:", err);
                }
            };

            // Set up a 5-minute sync interval (300,000ms)
            // For testing/initial rollout, we can use 1 min (60,000ms)
            intervalRef.current = setInterval(syncActivity, 60000); 

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [session]);

    return null; // Invisible component
}
