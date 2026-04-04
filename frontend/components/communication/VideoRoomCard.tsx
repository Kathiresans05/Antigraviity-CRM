"use client";

import React from 'react';
import { Video, Users, ArrowRight } from 'lucide-react';
import { useCommunication } from '@/frontend/context/CommunicationContext';

interface VideoRoomCardProps {
    room: {
        _id: string;
        name: string;
        allowedRoles: string[];
    };
    participantCount: number;
}

const VideoRoomCard: React.FC<VideoRoomCardProps> = ({ room, participantCount }) => {
    const { joinRoom, activeRoom } = useCommunication();
    const isActive = activeRoom === room.name;

    return (
        <div className={`group p-6 rounded-2xl border transition-all duration-300 ${
            isActive 
            ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20' 
            : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50'
        }`}>
            <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                }`}>
                    <Video className="w-6 h-6" />
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                    <Users className="w-3 h-3" />
                    {participantCount} Active
                </div>
            </div>

            <h3 className={`text-xl font-bold mb-2 ${isActive ? 'text-white' : 'text-slate-800'}`}>
                {room.name}
            </h3>
            
            <div className="flex flex-wrap gap-1.5 mb-6">
                {room.allowedRoles.length > 0 ? (
                    room.allowedRoles.map(role => (
                        <span key={role} className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                            {role}
                        </span>
                    ))
                ) : (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                        Public Room
                    </span>
                )}
            </div>

            <button
                onClick={() => joinRoom(room.name, 'video')}
                disabled={isActive}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isActive
                    ? 'bg-white/10 text-white/50 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                }`}
            >
                {isActive ? 'Already In Room' : 'Join Video Call'}
                {!isActive && <ArrowRight className="w-4 h-4" />}
            </button>
        </div>
    );
};

export default VideoRoomCard;
