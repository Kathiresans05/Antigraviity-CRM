"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Video, Search, RefreshCw, Plus } from 'lucide-react';
import VideoRoomCard from '@/frontend/components/communication/VideoRoomCard';
import { useCommunication } from '@/frontend/context/CommunicationContext';

export default function VideoRoomsPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { participants, activeRoom, roomCounts } = useCommunication();

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/communication/rooms');
            // Filter to show only video rooms
            const videoRooms = res.data.filter((r: any) => r.type === 'video');
            setRooms(videoRooms);
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Video className="w-8 h-8 text-blue-600" />
                        Video Meet
                    </h1>
                    <p className="text-slate-500 text-lg">High-quality face-to-face team collaboration.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search rooms..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                        />
                    </div>
                    <button 
                        onClick={fetchRooms}
                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all active:scale-95"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4" />
                        New Room
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 mb-6 shadow-sm">
                        <Video className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Video Rooms Found</h3>
                    <p className="text-slate-500 max-w-sm text-center">There are currently no active video conference rooms available for your role.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {rooms.map(room => (
                        <VideoRoomCard 
                            key={room._id} 
                            room={room} 
                            participantCount={roomCounts[room.name] || 0} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
