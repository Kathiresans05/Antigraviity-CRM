"use client";

import React, { useEffect, useState } from 'react';
import { useCommunication } from '@/frontend/context/CommunicationContext';
import { Users, Phone, Mic, MicOff, LogOut } from 'lucide-react';
import { useSession } from 'next-auth/react';
import VoiceRoomCard from '@/frontend/components/communication/VoiceRoomCard';

export default function CommunicationRoomsPage() {
    const { activeRoom, joinRoom, leaveRoom, participants } = useCommunication();
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await fetch('/api/communication/rooms');
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-800">Voice Rooms</h1>
                <p className="text-slate-500 text-sm">Join a voice room to start talking with your team in real-time.</p>
            </div>

            {activeRoom && (
                <div className="bg-[#1F6F8B]/10 border border-[#1F6F8B]/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1F6F8B] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#1F6F8B]/20">
                            <Mic className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Currently in</p>
                            <h3 className="text-lg font-bold text-[#1F6F8B] leading-none mt-1">{activeRoom}</h3>
                        </div>
                    </div>
                    <button 
                        onClick={leaveRoom}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-lg shadow-rose-500/20 font-semibold text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Leave Room
                    </button>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <VoiceRoomCard 
                            key={room._id} 
                            room={room} 
                            activeRoom={activeRoom}
                            onJoin={() => joinRoom(room.name)}
                            participantCount={activeRoom === room.name ? participants.length : 0}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
