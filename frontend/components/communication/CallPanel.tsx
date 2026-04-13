"use client";

import React, { useState } from 'react';
import { useCommunication } from '@/frontend/context/CommunicationContext';
import { Mic, MicOff, PhoneOff, Users, ChevronUp, ChevronDown, Video, VideoOff, MessageSquare, MonitorUp, MonitorX } from 'lucide-react';
import clsx from 'clsx';

const CallPanel: React.FC = () => {
    const { 
        activeRoom, 
        activeRoomType, 
        participants, 
        isMicMuted, 
        isVideoOn, 
        isScreenSharing,
        screenStream,
        toggleMic, 
        toggleVideo, 
        toggleScreenShare,
        leaveRoom 
    } = useCommunication();
    const [collapsed, setCollapsed] = useState(false);

    if (!activeRoom || activeRoomType === 'chat') return null;

    const isVideoRoom = activeRoomType === 'video';

    return (
        <div className={clsx(
            "fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out flex flex-col shadow-2xl rounded-3xl overflow-hidden border border-white/20",
            collapsed ? "h-20 w-80" : isVideoRoom ? "h-[600px] w-[800px]" : "h-[450px] w-80",
            "bg-[#0f172a]/95 backdrop-blur-xl"
        )}>
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isVideoRoom ? "bg-purple-500/10 text-purple-400" : "bg-green-500/10 text-green-400"
                    )}>
                        {isVideoRoom ? <Video className="w-5 h-5" /> : <PhoneOff className="w-5 h-5 rotate-135" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] leading-none">
                            {isVideoRoom ? "Video Meet" : "Voice Room"}
                        </span>
                        <span className="text-sm font-bold text-white mt-1.5 truncate max-w-[200px]">{activeRoom}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-white/70 transition-colors"
                    >
                        {collapsed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {!collapsed && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    {isVideoRoom ? (
                        <div className="flex-1 p-4 bg-black/40">
                             <VideoGrid />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">Participants</span>
                                <span className="text-[10px] font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{participants.length}</span>
                            </div>
                            
                            {participants.map((p: any, idx: number) => (
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
                </div>
            )}

            {/* Controls */}
            <div className="p-5 bg-white/5 border-t border-white/10 shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-3">
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
                            {!collapsed && <span>{isMicMuted ? "Unmute" : "Mute"}</span>}
                        </button>

                        {isVideoRoom && (
                            <button 
                                onClick={toggleVideo}
                                className={clsx(
                                    "flex-1 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 font-bold text-xs gap-2.5",
                                    !isVideoOn 
                                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                                        : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                                )}
                            >
                                {!isVideoOn ? <VideoOff className="w-4.5 h-4.5" /> : <Video className="w-4.5 h-4.5" />}
                                {!collapsed && <span>{isVideoOn ? "Stop Video" : "Start Video"}</span>}
                            </button>
                        )}

                        {isVideoRoom && (
                            <button 
                                onClick={toggleScreenShare}
                                className={clsx(
                                    "flex-1 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 font-bold text-xs gap-2.5",
                                    isScreenSharing 
                                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                        : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                                )}
                            >
                                {isScreenSharing ? <MonitorX className="w-4.5 h-4.5" /> : <MonitorUp className="w-4.5 h-4.5" />}
                                {!collapsed && <span>{isScreenSharing ? "Stop Sharing" : "Screen Share"}</span>}
                            </button>
                        )}
                    </div>
                    
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

const VideoGrid: React.FC = () => {
    const { localStream, remoteStreams, participants, isScreenSharing, screenStream } = useCommunication();
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full overflow-y-auto content-start">
            {/* Local Video */}
            <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 shadow-2xl">
                <video 
                    autoPlay 
                    muted 
                    playsInline 
                    ref={v => { 
                        if (v) {
                            if (isScreenSharing && screenStream) {
                                v.srcObject = screenStream;
                            } else {
                                v.srcObject = localStream;
                            }
                        }
                    }} 
                    className={clsx("w-full h-full object-cover", !isScreenSharing && "-scale-x-100")}
                />
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[10px] font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    You (Host) {isScreenSharing && "- Screen"}
                </div>
            </div>

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([socketId, stream]: [string, MediaStream]) => {
                const participant = participants.find((p: any) => p.socketId === socketId);
                return (
                    <div key={socketId} className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                        <video 
                            autoPlay 
                            playsInline 
                            ref={v => { if (v) v.srcObject = stream; }} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[10px] font-bold text-white flex items-center gap-1.5">
                             <span className={clsx(
                                "w-2 h-2 rounded-full",
                                participant?.micActive ? "bg-green-500" : "bg-rose-500"
                             )} />
                            {participant?.name || "Participant"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CallPanel;
