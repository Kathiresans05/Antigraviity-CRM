"use client";

import { useState } from "react";
import {
    User, Building2, ShieldCheck, Bell,
    Camera, Mail, Phone, Lock,
    CheckCircle2, Globe, Palette, Clock,
    ChevronRight, Save, LogOut, ArrowUpRight
} from "lucide-react";
import { useSession } from "next-auth/react";
import clsx from "clsx";

// ─── Components ─────────────────────────────────────────────────────────────

function SettingTab({ label, icon: Icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm w-full md:w-auto",
                active
                    ? "bg-[#0f172a] text-white shadow-md shadow-blue-500/20"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function InputField({ label, value, type = "text", placeholder, icon: Icon }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 pl-1">{label}</label>
            <div className="relative">
                {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
                <input
                    type={type}
                    defaultValue={value}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
                        Icon ? "pl-11" : "px-4"
                    )}
                />
            </div>
        </div>
    );
}

function ToggleSetting({ label, description, checked, onChange }: any) {
    return (
        <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-xs font-medium text-gray-400">{description}</p>
            </div>
            <button
                onClick={onChange}
                className={clsx(
                    "w-11 h-6 rounded-full transition-all relative",
                    checked ? "bg-emerald-500" : "bg-gray-200"
                )}
            >
                <div className={clsx(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    checked ? "left-6" : "left-1"
                )} />
            </button>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState("profile");
    const [notifs, setNotifs] = useState({ email: true, push: false, sms: true });

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">System Settings</h2>
                    <p className="text-sm font-medium text-gray-500">Manage your account and organization preferences</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-[#0f172a] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-blue-500/20">
                    <Save className="w-4 h-4" /> Save Changes
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
                <SettingTab
                    label="Profile"
                    icon={User}
                    active={activeTab === "profile"}
                    onClick={() => setActiveTab("profile")}
                />
                <SettingTab
                    label="Organization"
                    icon={Building2}
                    active={activeTab === "org"}
                    onClick={() => setActiveTab("org")}
                />
                <SettingTab
                    label="Security"
                    icon={ShieldCheck}
                    active={activeTab === "security"}
                    onClick={() => setActiveTab("security")}
                />
                <SettingTab
                    label="Notifications"
                    icon={Bell}
                    active={activeTab === "notifs"}
                    onClick={() => setActiveTab("notifs")}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile Tab */}
                    {activeTab === "profile" && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                <div className="flex items-center gap-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-2xl bg-[#0f172a]/10 flex items-center justify-center text-[#0f172a] text-3xl font-black border-2 border-white shadow-lg overflow-hidden">
                                            {session?.user?.image ? (
                                                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{session?.user?.name?.[0] || "U"}</span>
                                            )}
                                        </div>
                                        <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-md border border-gray-100 text-gray-600 hover:text-[#0f172a] transition-all">
                                            <Camera className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{session?.user?.name || "User Name"}</h3>
                                        <p className="text-sm font-semibold text-gray-500">{session?.user?.email || "user@example.com"}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-wider">Administrator</span>
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black uppercase tracking-wider">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Full Name" value={session?.user?.name} icon={User} />
                                <InputField label="Email Address" value={session?.user?.email} icon={Mail} />
                                <InputField label="Phone Number" placeholder="+1 (555) 000-0000" icon={Phone} />
                                <InputField label="Preferred Name" placeholder="Nick name" />
                            </div>
                        </div>
                    )}

                    {/* Organization Tab */}
                    {activeTab === "org" && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="p-8 border-b border-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">Organization Settings</h3>
                                <p className="text-sm font-medium text-gray-500">Manage company-wide identities</p>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Company Name" value="Antigraviity Corp" icon={Building2} />
                                    <InputField label="Registration ID" value="REG-2024-8892" />
                                    <InputField label="Support Email" value="support@antigraviity.com" icon={Mail} />
                                    <InputField label="Website" value="https://antigraviity.com" icon={Globe} />
                                </div>
                                <div className="pt-6 border-t border-gray-50">
                                    <h4 className="text-sm font-bold text-gray-900 mb-4">Branding Configuration</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-500">Accent Color</label>
                                            <div className="flex items-center gap-2">
                                                {["#0f172a", "#3b82f6", "#6366f1", "#10b981", "#f59e0b"].map((color) => (
                                                    <button
                                                        key={color}
                                                        className={clsx("w-8 h-8 rounded-lg border-2 border-white shadow-sm ring-1 ring-gray-100")}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                                <button className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                    <Palette className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500">Time Zone</label>
                                            <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold">
                                                <option>Calculated (UTC+5:30)</option>
                                                <option>PST (UTC-8:00)</option>
                                                <option>EST (UTC-5:00)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === "security" && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="p-8 border-b border-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">Security & Privacy</h3>
                                <p className="text-sm font-medium text-gray-500">Protect your account and monitor activity</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="p-6 bg-rose-50/30 border border-rose-100 rounded-2xl">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
                                        <Lock className="w-4 h-4 text-rose-500" /> Password Management
                                    </h4>
                                    <p className="text-xs font-medium text-gray-500 mb-4">Last changed 4 months ago. We recommend changing it periodically.</p>
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                                        <p className="text-[13px] font-bold text-orange-600">
                                            Password cannot be changed here. Use the "Reset Password" utility if needed.
                                        </p>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    <ToggleSetting
                                        label="Two-Factor Authentication"
                                        description="Add an extra layer of security using OTP or App."
                                        checked={true}
                                    />
                                    <ToggleSetting
                                        label="Login Activity Alerts"
                                        description="Notify me when there is a new login on an unrecognized device."
                                        checked={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === "notifs" && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="p-8 border-b border-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">Notification Preferences</h3>
                                <p className="text-sm font-medium text-gray-500">Control how we communicate with you</p>
                            </div>
                            <div className="p-8 divide-y divide-gray-50">
                                <ToggleSetting
                                    label="Email Notifications"
                                    description="Receive daily summaries and system alerts via email."
                                    checked={notifs.email}
                                    onChange={() => setNotifs({ ...notifs, email: !notifs.email })}
                                />
                                <ToggleSetting
                                    label="Desktop Push"
                                    description="Real-time alerts for tasks and meetings."
                                    checked={notifs.push}
                                    onChange={() => setNotifs({ ...notifs, push: !notifs.push })}
                                />
                                <ToggleSetting
                                    label="SMS Alerts"
                                    description="Emergency notifications and urgent broadcasts."
                                    checked={notifs.sms}
                                    onChange={() => setNotifs({ ...notifs, sms: !notifs.sms })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info Panels */}
                <div className="space-y-6">
                    {/* Account Status Card */}
                    <div className="bg-[#1f2937] p-8 rounded-2xl shadow-lg relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <CheckCircle2 className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-4">Account Integrity</h3>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Verify Email</span>
                                    <span className="px-2 py-0.5 bg-emerald-500 rounded-md text-[10px] font-black uppercase">Verified</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Security Score</span>
                                    <span className="text-blue-400 font-bold">85%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full w-[85%]" />
                                </div>
                            </div>
                            <button className="w-full bg-white text-gray-900 py-3 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                                Run Security Audit <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Support Link */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Need help?</h4>
                        <p className="text-xs font-medium text-gray-500 mb-4">Contact our support team for specialized configurations.</p>
                        <button className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline">
                            Open Support Portal <ChevronRight className="w-3" />
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="p-6 bg-rose-50/30 border border-rose-100 rounded-2xl">
                        <h4 className="text-sm font-bold text-rose-600 mb-4">Danger Zone</h4>
                        <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-rose-100 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-50 transition-all">
                            <LogOut className="w-3.5 h-3.5" /> Deactivate Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
