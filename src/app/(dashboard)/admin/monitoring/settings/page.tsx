"use client";

import { useState } from "react";
import { Settings, Shield, Clock, Eye, HardDrive, Bell, Save, Lock, AlertCircle, Info, CheckCircle2 } from "lucide-react";

export default function MonitoringSettings() {
    const [settings, setSettings] = useState({
        bannerText: "This corporate device is monitored for work & security purposes.",
        streamQuality: "Medium (480p)",
        fpsLimit: "5 FPS",
        privacySchedule: true,
        requireAuditReason: true,
        retentionDays: 30,
    });

    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 1500);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div className="flex items-center justify-between bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm border border-indigo-50">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-gray-900 rounded-[32px] text-white shadow-xl shadow-gray-200">
                        <Settings className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-2">Policy Settings</h1>
                        <p className="text-gray-400 font-medium text-sm">Configure enterprise compliance and transparency protocols.</p>
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {loading ? "Optimizing..." : "Deploy Policies"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Transparency Section */}
                <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Transparency & Banner</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Display Messenger Banner Text</label>
                            <textarea 
                                className="w-full bg-gray-50 border-none rounded-3xl p-5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-100 min-h-[100px] resize-none"
                                value={settings.bannerText}
                                onChange={(e) => setSettings({...settings, bannerText: e.target.value})}
                            />
                        </div>

                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Persistent Visibility</h4>
                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">The banner window is non-interruptible and stays on top of all applications.</p>
                            </div>
                            <div className="w-12 h-6 bg-indigo-600 rounded-full relative shadow-inner">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit & Compliance */}
                <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <Lock className="w-6 h-6 text-rose-600" />
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Audit Enforcement</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <div className="flex items-center gap-4">
                                <Eye className="w-6 h-6 text-indigo-500" />
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-1">Mandatory Audit Reason</h4>
                                    <p className="text-[10px] text-gray-500 font-medium">Force admins to declare a reason before opening live monitor.</p>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={settings.requireAuditReason}
                                onChange={(e) => setSettings({...settings, requireAuditReason: e.target.checked})}
                                className="w-6 h-6 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Log Retention Period (Days)</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="7" 
                                    max="365"
                                    value={settings.retentionDays}
                                    onChange={(e) => setSettings({...settings, retentionDays: parseInt(e.target.value)})}
                                    className="grow h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="px-4 py-2 bg-gray-900 rounded-xl text-xs font-black text-white min-w-[60px] text-center">{settings.retentionDays}d</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 px-1 uppercase tracking-widest">
                                <span>7 Days (Min)</span>
                                <span>1 Year (Max)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Section */}
                <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <HardDrive className="w-6 h-6 text-emerald-600" />
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Stream Efficiency</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Frame Resolution</label>
                                <select className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-100 cursor-pointer">
                                    <option>Low (240p)</option>
                                    <option selected>Medium (480p)</option>
                                    <option>High (720p)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Refresh Rate</label>
                                <select className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-100 cursor-pointer">
                                    <option>1 FPS</option>
                                    <option selected>5 FPS</option>
                                    <option>10 FPS</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy Windows Section */}
                <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <Clock className="w-6 h-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Privacy Windows</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                            <div className="flex items-center gap-4 text-indigo-600">
                                <Shield className="w-5 h-5 animate-pulse" />
                                <div>
                                    <h4 className="text-sm font-bold text-indigo-900 mb-0.5">Automated Privacy Protection</h4>
                                    <p className="text-[10px] text-indigo-700 font-medium">Auto-disable stream during lunch and after-hours.</p>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={settings.privacySchedule}
                                onChange={(e) => setSettings({...settings, privacySchedule: e.target.checked})}
                                className="w-6 h-6 rounded-lg border-indigo-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                        </div>
                        
                        <div className="bg-white/50 border border-gray-100 p-5 rounded-2xl space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Schedule Configuration</p>
                            <div className="flex items-center justify-between text-xs font-bold text-gray-700 bg-gray-50 p-3 rounded-xl">
                                <span>Employee Work Hours</span>
                                <span className="text-indigo-600">09:00 - 18:00</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-gray-700 bg-gray-50 p-3 rounded-xl">
                                <span>Mandatory Privacy Window</span>
                                <span className="text-rose-600">13:00 - 14:00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-indigo-900 text-white p-10 rounded-[56px] shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center gap-10">
                <div className="p-6 bg-white/10 rounded-[32px] backdrop-blur-xl border border-white/10 shrink-0 shadow-lg">
                    <AlertCircle className="w-12 h-12 text-indigo-300" />
                </div>
                <div className="space-y-4">
                    <h3 className="text-2xl font-black tracking-tight leading-none uppercase italic">Compliance Architecture</h3>
                    <p className="text-indigo-200 leading-relaxed text-sm font-medium">
                        This system is strictly architected for <span className="text-white font-bold underline underline-offset-4 decoration-indigo-400 decoration-2">Transparency and Corporate Governance</span>. Every administrative access point, setting change, and live view session is cryptographically hashed and stored in our tamper-evident audit ledger. Failure to adhere to company monitoring protocols may result in immediate administrative action.
                    </p>
                    <div className="pt-4 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Employee-Notice Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">GDPR Ready Logs</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Always-On Visibility</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
