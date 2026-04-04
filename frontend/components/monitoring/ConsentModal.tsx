"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Info, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

export default function ConsentModal() {
    const { data: session } = useSession();
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if consent was already given in this session
        const hasConsented = sessionStorage.getItem("monitoring-consent");
        const userRole = (session?.user as any)?.role;

        // Only show for Employees (as per typical monitoring policies, 
        // but can be adjusted via Admin settings later)
        if (!hasConsented && session?.user && userRole === "Employee") {
            setShow(true);
        }
    }, [session]);

    const handleAccept = async () => {
        if (loading) return;
        setLoading(true);
        console.log("[Monitoring] handleAccept triggered.");
        toast.loading("Initiating Tracker...", { id: "monitor-init" });

        try {
            // 1. Inform Backend
            console.log("[Monitoring] 1. Sending consent to API...");
            const consentRes = await fetch("/api/monitoring/consent", {
                method: "POST",
                body: JSON.stringify({ 
                    accepted: true, 
                    appVersion: "1.0.0",
                    text: "Work activity tracking is enabled during office hours..."
                }),
                headers: { "Content-Type": "application/json" }
            });
            if (!consentRes.ok) throw new Error("Consent API Failed (HTTP " + consentRes.status + ")");

            // 2. Start Session
            console.log("[Monitoring] 2. Starting session API...");
            toast.loading("Starting Session...", { id: "monitor-init" });
            const res = await fetch("/api/monitoring/session", {
                method: "POST",
                body: JSON.stringify({ action: "start" }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();

            if (data.sessionId) {
                // 3. Start Electron Tracker via IPC
                console.log("[Monitoring] 3. Calling Electron IPC start...");
                toast.loading("Activating Tracker Hook...", { id: "monitor-init" });
                
                if (window.electronAPI?.monitoring) {
                    const result = await (window.electronAPI.monitoring as any).start();
                    console.log("[Monitoring] IPC Start Result:", result);
                    
                    if (result.status === 'error') {
                        throw new Error(result.error || "Hook failed to start. Run as Admin.");
                    }
                    
                    toast.success("Monitoring Started Successfully!", { id: "monitor-init" });
                } else {
                    toast.error("Electron API Missing!", { id: "monitor-init" });
                }
                
                sessionStorage.setItem("monitoring-consent", "true");
                sessionStorage.setItem("monitoring-session-id", data.sessionId);
                setShow(false);
            } else {
                throw new Error("No Session ID returned from server.");
            }
        } catch (err: any) {
            console.error("[Monitoring] Initialization Failed:", err);
            toast.error("Failed: " + err.message, { id: "monitor-init", duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
                <div className="bg-blue-600 p-6 flex items-center gap-4 text-white">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold leading-tight">System Activity Monitoring</h2>
                        <p className="text-blue-100 text-sm mt-1">Transparency & Productivity Disclosure</p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
                        <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div className="text-sm text-blue-900 leading-relaxed">
                            <strong>Work activity tracking is enabled during office hours.</strong> 
                            <ul className="mt-2 space-y-2 list-disc list-inside opacity-90">
                                <li>Records keyboard and mouse event <strong>counts</strong> only.</li>
                                <li>Tracks idle time and total active session duration.</li>
                                <li>Does <strong>NOT</strong> record keys, passwords, or content.</li>
                                <li>Does <strong>NOT</strong> take screenshots or monitor browser history.</li>
                            </ul>
                        </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                        By proceeding, you acknowledge that these metrics are collected to help optimize 
                        workflow and support performance reviews.
                    </p>

                    <button
                        onClick={handleAccept}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
                    >
                        I Understand & Acknowledge
                    </button>
                    
                    <p className="text-center text-gray-400 text-[10px] mt-4 uppercase tracking-widest">
                        Antigraviity Enterprise CRM v1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
}
