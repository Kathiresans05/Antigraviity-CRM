"use client";

import React from 'react';
import { Users, Phone, Shield, Video, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function CommunicationPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Team Communication</h1>
                <p className="text-slate-500 text-lg">Connect with your team in real-time through voice and collaboration tools.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Voice Rooms Card */}
                <Link href="/communication/rooms" className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Phone className="w-32 h-32 -rotate-12" />
                    </div>
                    
                    <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white mb-8 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <Users className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">Voice Rooms</h3>
                    <p className="text-slate-500 leading-relaxed mb-8">Join role-based voice channels for quick standups, brainstorming, or casual team syncs.</p>
                    
                    <div className="flex items-center text-blue-600 font-bold text-sm gap-2">
                        Enter Rooms
                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            →
                        </div>
                    </div>
                </Link>

                {/* Video Meet Card */}
                <Link href="/communication/video" className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Video className="w-32 h-32 -rotate-12" />
                    </div>
                    
                    <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center text-white mb-8 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        <Video className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">Video Meet</h3>
                    <p className="text-slate-500 leading-relaxed mb-8">High-quality face-to-face video conferencing for formal team meetings and presentations.</p>
                    
                    <div className="flex items-center text-purple-600 font-bold text-sm gap-2">
                        Start Meeting
                        <div className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            →
                        </div>
                    </div>
                </Link>

                {/* Team Chat Card */}
                <Link href="/communication/chat" className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MessageSquare className="w-32 h-32 -rotate-12" />
                    </div>
                    
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white mb-8 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">Team Chat</h3>
                    <p className="text-slate-500 leading-relaxed mb-8">Persistent text channels and direct messaging for asynchronous team collaboration.</p>
                    
                    <div className="flex items-center text-emerald-600 font-bold text-sm gap-2">
                        Open Channels
                        <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            →
                        </div>
                    </div>
                </Link>
            </div>

            {/* Security Note */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 ring-1 ring-blue-500/30">
                        <Shield className="w-10 h-10" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold mb-2">Secure & Internal Only</h4>
                        <p className="text-slate-400 leading-relaxed max-w-2xl">Your communication is end-to-end encrypted and restricted to authenticated team members only. We use peer-to-peer technology to ensure high performance and low latency.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
