"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MessageSquare, Hash, User, Shield, Search, RefreshCw, Layers } from 'lucide-react';
import { useCommunication } from '@/frontend/context/CommunicationContext';
import ChatPanel from '@/frontend/components/communication/ChatPanel';
import clsx from 'clsx';

export default function TeamChatPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { activeRoom, joinRoom, activeRoomType } = useCommunication();

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/communication/rooms');
            // Show all room types that support chat (or just 'chat' rooms)
            const chatRooms = res.data.filter((r: any) => r.type === 'chat');
            setRooms(chatRooms);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    return (
        <div className="h-[calc(100vh-160px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                        Team Chat
                    </h1>
                    <p className="text-slate-500 text-lg">Persistent collaboration and instant messaging.</p>
                </div>
            </div>

            <div className="flex-1 flex gap-8 min-h-0">
                {/* Channels Sidebar */}
                <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/10">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Find channels..." 
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Channels</span>
                            <button onClick={fetchRooms} className={clsx("p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all", loading && 'animate-spin')}>
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                            ))
                        ) : rooms.map(room => {
                            const isActive = activeRoom === room.name && activeRoomType === 'chat';
                            return (
                                <button
                                    key={room._id}
                                    onClick={() => joinRoom(room.name, 'chat')}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group",
                                        isActive 
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95" 
                                            : "text-slate-600 hover:bg-slate-50 active:bg-blue-50 ring-1 ring-transparent hover:ring-slate-100"
                                    )}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={clsx(
                                            "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                            isActive 
                                                ? "bg-white/20" 
                                                : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:scale-110"
                                        )}>
                                            <Hash className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="text-sm font-bold truncate tracking-wide">{room.name}</span>
                                            <span className={clsx(
                                                "text-[9px] font-medium uppercase tracking-wider mt-0.5",
                                                isActive ? "text-white/60" : "text-slate-400"
                                            )}>
                                                {room.allowedRoles.length > 0 ? `${room.allowedRoles.length} Roles` : 'Public'}
                                            </span>
                                        </div>
                                    </div>
                                    {!isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white ring-4 ring-slate-100">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Channel Rules</p>
                                <p className="text-xs font-bold text-slate-800 leading-tight">Be professional and collaborative.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Panel Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {activeRoom && activeRoomType === 'chat' ? (
                        <ChatPanel />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm gap-8 p-12 text-center group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl group-hover:blur-2xl transition-all"></div>
                                <div className="relative w-24 h-24 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center justify-center text-blue-500 shadow-xl group-hover:scale-110 transition-transform duration-500 rotate-6 group-hover:rotate-0">
                                    <MessageSquare className="w-12 h-12" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Select a Channel</h3>
                                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                                    Choose a channel from the sidebar to start collaborating with your team in real-time. All conversations are logged for future reference.
                                </p>
                            </div>
                            <div className="flex gap-4">
                               <span className="px-5 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">End-to-End Encrypted</span>
                               <span className="px-5 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Internal Only</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
