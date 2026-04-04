"use client";

import React, { useState } from 'react';
import { useCommunication } from '@/frontend/context/CommunicationContext';
import { Mic, MicOff, PhoneOff, Users, ChevronUp, ChevronDown, User } from 'lucide-react';
import clsx from 'clsx';

const CallPanel: React.FC = () => {
    const { activeRoom, participants, isMicMuted, toggleMic, leaveRoom } = useCommunication();
    const [collapsed, setCollapsed] = useState(false);

    if (!activeRoom) return null;

    return (
        <div className={clsx(
            "fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out w-80 flex flex-col shadow-2xl rounded-3xl overflow-hidden border border-white/20",
            collapsed ? "h-20" : "h-[450px]",
            "bg-[#0f172a]/95 backdrop-blur-xl"
        )}>
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                        <PhoneOff className="w-5 h-5 rotate-135" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] leading-none">Voice Room</span>
                        <span className="text-sm font-bold text-white mt-1.5 truncate w-32">{activeRoom}</span>
                    </div>
                </div>
                
                <button 
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2.5 rounded-xl hover:bg-white/10 text-white/70 transition-colors"
                >
                    {collapsed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
            </div>

            {/* Participants */}
            {!collapsed && (
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">Participants</span>
                        <span className="text-[10px] font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{participants.length}</span>
                    </div>
                    
                    {participants.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3.5">
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-blue-400 font-bold text-xs ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all">
                                        {p.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={clsx(
                                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-[#0f172a] rounded-full shadow-lg",
                                        p.micActive ? "bg-green-500" : "bg-rose-500"
                                    )} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-white truncate w-32 group-hover:text-blue-400 transition-colors tracking-wide">{p.name}</span>
                                    <span className="text-[9px] font-medium text-white/40 uppercase mt-0.5 tracking-[0.1em]">{p.role}</span>
                                </div>
                            </div>
                            {!p.micActive && <MicOff className="w-3.5 h-3.5 text-rose-500 shadow-rose-500/20" />}
                        </div>
                    ))}
                </div>
            )}

            {/* Controls */}
            <div className="p-5 bg-white/5 border-t border-white/10 shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <button 
                        onClick={toggleMic}
                        className={clsx(
                            "flex-1 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 font-bold text-xs gap-2.5",
                            isMicMuted 
                                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                                : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                        )}
                    >
                        {isMicMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                        <span>{isMicMuted ? "Unmute" : "Mute"}</span>
                    </button>
                    
                    <button 
                        onClick={leaveRoom}
                        className="w-12 h-12 rounded-2xl bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-all duration-300 group shadow-lg shadow-rose-500/0 hover:shadow-rose-500/20 active:scale-95 border border-rose-500/20 hover:border-transparent"
                        title="Disconnect"
                    >
                        <PhoneOff className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallPanel;
