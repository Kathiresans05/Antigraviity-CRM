"use client";

import React from 'react';
import { Users, Phone, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';

interface VoiceRoomCardProps {
    room: any;
    activeRoom: string | null;
    onJoin: () => void;
    participantCount: number;
}

const VoiceRoomCard: React.FC<VoiceRoomCardProps> = ({ room, activeRoom, onJoin, participantCount }) => {
    const isJoined = activeRoom === room.name;
    const isAllowed = true; // Handled by API, but we could add client-side check

    return (
        <div className={clsx(
            "group bg-white rounded-2xl p-6 border-2 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden",
            isJoined ? "border-[#1F6F8B] shadow-lg shadow-[#1F6F8B]/20" : "border-slate-100/50 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/50"
        )}>
            {/* Background design element */}
            <div className={clsx(
                "absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-125",
                isJoined ? "bg-[#1F6F8B]" : "bg-slate-500"
            )} />

            <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between">
                    <div className={clsx(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300",
                        isJoined ? "bg-[#1F6F8B] text-white" : "bg-slate-50/80 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600"
                    )}>
                        <Phone className="w-7 h-7" />
                    </div>
                    
                    <div className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                        participantCount > 0 ? "bg-green-500/10 text-green-600" : "bg-slate-100 text-slate-400"
                    )}>
                        <div className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            participantCount > 0 ? "bg-green-500 animate-pulse" : "bg-slate-300"
                        )} />
                        {participantCount} Active
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-slate-800">{room.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        {room.allowedRoles?.length > 0 
                            ? `Exclusively for ${room.allowedRoles.join(', ')}`
                            : "Open to every team member."}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onJoin}
                        disabled={isJoined}
                        className={clsx(
                            "flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md",
                            isJoined 
                                ? "bg-green-50 text-green-600 border border-green-200/50 cursor-default" 
                                : "bg-[#1F6F8B] hover:bg-[#154c5f] text-white hover:shadow-lg hover:shadow-[#1F6F8B]/30"
                        )}
                    >
                        {isJoined ? (
                            <>
                                <Phone className="w-4 h-4" />
                                Connected
                            </>
                        ) : (
                            <>
                                <Phone className="w-4 h-4" />
                                Join Voice Room
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceRoomCard;
