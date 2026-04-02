"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Clock, Database, Save, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "react-hot-toast";

export default function MonitoringSettingsPage() {
    const [settings, setSettings] = useState<any>({
        isTrackingEnabled: true,
        idleThresholdSeconds: 300,
        blockDurationMinutes: 5,
        dataRetentionDays: 90
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/monitoring/settings");
                const data = await res.json();
                if (data.settings) setSettings(data.settings);
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/monitoring/settings", {
                method: "PATCH",
                body: JSON.stringify(settings),
                headers: { "Content-Type": "application/json" }
            });
            if (res.ok) {
                toast.success("Monitoring configurations updated successfully!");
            }
        } catch (err) {
            toast.error("Failed to update settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Governance Controls...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-rose-50 rounded-2xl text-rose-600">
                        <Shield className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Monitoring & Productivity Controls</h2>
                        <p className="text-gray-400 text-sm font-medium">Fine-tune workforce tracking and compliance settings.</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    <Save className="w-5 h-5" /> {saving ? "Saving..." : "Update Policies"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ActivityIcon className="w-6 h-6 text-rose-600" />
                            <h3 className="font-black text-gray-800 uppercase tracking-widest text-[11px]">Core Monitoring</h3>
                        </div>
                        <button 
                            onClick={() => setSettings({...settings, isTrackingEnabled: !settings.isTrackingEnabled})}
                            className={`p-1 rounded-full transition-colors ${settings.isTrackingEnabled ? "text-emerald-500" : "text-gray-300"}`}
                        >
                            {settings.isTrackingEnabled ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                        </button>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 mb-1">Enable Global Activity Tracking</p>
                        <p className="text-xs text-gray-400 leading-relaxed">When enabled, the Electron app will capture mouse and keyboard event counts for all employees during active sessions.</p>
                    </div>
                </div>

                <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-amber-500" />
                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-[11px]">Idle Sensitivity</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-gray-900 mb-1">Idle Threshold (Seconds)</p>
                        <input
                            type="number"
                            value={settings.idleThresholdSeconds}
                            onChange={(e) => setSettings({...settings, idleThresholdSeconds: parseInt(e.target.value)})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none"
                        />
                    </div>
                </div>

                <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <Settings className="w-6 h-6 text-blue-500" />
                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-[11px]">Data Resolution</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-gray-900 mb-1">Aggregation Block (Minutes)</p>
                        <select
                            value={settings.blockDurationMinutes}
                            onChange={(e) => setSettings({...settings, blockDurationMinutes: parseInt(e.target.value)})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none"
                        >
                            <option value={5}>Every 5 Minutes (Optimal)</option>
                            <option value={10}>Every 10 Minutes</option>
                        </select>
                    </div>
                </div>

                <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <Database className="w-6 h-6 text-indigo-500" />
                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-[11px]">Data Lifecycle</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-gray-900 mb-1">Record Retention (Days)</p>
                        <input
                            type="number"
                            value={settings.dataRetentionDays}
                            onChange={(e) => setSettings({...settings, dataRetentionDays: parseInt(e.target.value)})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none"
                        />
                        <p className="text-[10px] text-gray-400 font-medium italic">Activity blocks older than this will be automatically purged. High storage impact for &gt; 180 days.</p>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-900 leading-relaxed font-medium">
                    Changes to these policies will be recorded in the <strong>Compliance Audit Log</strong>. 
                </p>
            </div>
        </div>
    );
}

function ActivityIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>;
}
