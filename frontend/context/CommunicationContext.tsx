"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface CommunicationContextType {
    socket: Socket | null;
    activeRoom: string | null;
    activeRoomType: "voice" | "video" | "chat" | null;
    participants: any[];
    messages: any[];
    roomCounts: Record<string, number>;
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    isMicMuted: boolean;
    isVideoOn: boolean;
    joinRoom: (roomId: string, type: "voice" | "video" | "chat") => Promise<void>;
    leaveRoom: () => void;
    toggleMic: () => void;
    toggleVideo: () => void;
    sendMessage: (text: string) => void;
}

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [activeRoomType, setActiveRoomType] = useState<"voice" | "video" | "chat" | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);

    const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
    const socketRef = useRef<Socket | null>(null);
    const activeRoomRef = useRef<string | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const activeRoomTypeRef = useRef<"voice" | "video" | "chat" | null>(null);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_COMMUNICATION_URL || 'http://localhost:3001';
        console.log('[Comm] Connecting to signaling server:', socketUrl);
        const newSocket = io(socketUrl);
        setSocket(newSocket);
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('[Comm] Socket connected:', newSocket.id);
            // Aggressive auto re-join
            if (activeRoomRef.current && session?.user) {
                console.log('[Comm] Re-joining room:', activeRoomRef.current);
                newSocket.emit('join-room', {
                    roomId: activeRoomRef.current,
                    user: {
                        id: (session.user as any).id || session.user.email,
                        name: session.user.name,
                        role: (session.user as any).role,
                    }
                });
            }
        });

        newSocket.on('room-update', (fullList) => {
            console.log('[Comm] Received full room update:', fullList.length, 'participants');
            setParticipants(fullList);
        });

        // ------------------------------------------------------------------------------------------------
        // GLOBAL CLOUD-SYNC LISTENER: Multi-Server Instance Synchronization
        // ------------------------------------------------------------------------------------------------
        newSocket.on('global-presence-sync', ({ roomStates, globalCounts }: { roomStates: Record<string, any[]>, globalCounts: Record<string, number> }) => {
            // Update the Active room participant list (De-duplicated across servers)
            if (activeRoomRef.current) {
                const currentRoomParticipants = roomStates[activeRoomRef.current.toLowerCase()] || [];
                if (currentRoomParticipants.length > 0) {
                    setParticipants(currentRoomParticipants);
                }
            }

            // Sync all Hub card counts globally
            if (globalCounts) {
                setRoomCounts(globalCounts);
            }
        });

        newSocket.on('user-connected', ({ socketId, user }) => {
            console.log('[Comm] User connected:', user.name);
            setParticipants(prev => {
                if (prev.find(p => p.socketId === socketId)) return prev;
                return [...prev, { ...user, socketId, micActive: true, videoActive: true }];
            });
            
            if (activeRoomRef.current && localStreamRef.current) {
                createPeer(socketId, newSocket, localStreamRef.current, true);
            }
        });

        newSocket.on('user-disconnected', (socketId) => {
            console.log('[Comm] User disconnected:', socketId);
            setParticipants(prev => prev.filter(p => p.socketId !== socketId));
            if (peersRef.current.has(socketId)) {
                peersRef.current.get(socketId)?.destroy();
                peersRef.current.delete(socketId);
            }
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.delete(socketId);
                return newMap;
            });
        });

        newSocket.on('room-participants', (list) => {
            // Only update if we don't have a more recent full list or to initial load
            setParticipants(list);
        });

        newSocket.on('global-room-presence', (presence: Record<string, number>) => {
            setRoomCounts(presence);
        });

        const handleSignal = ({ senderId, signal }: { senderId: string, signal: any }) => {
            if (peersRef.current.has(senderId)) {
                peersRef.current.get(senderId)?.signal(signal);
            } else if (activeRoomRef.current && localStreamRef.current) {
                createPeer(senderId, socketRef.current!, localStreamRef.current, false, signal);
            }
        };

        newSocket.on('voice-signal', handleSignal);
        newSocket.on('video-signal', handleSignal);

        newSocket.on('mic-status-updated', ({ socketId, micActive }) => {
            setParticipants(prev => prev.map(p => 
                p.socketId === socketId ? { ...p, micActive } : p
            ));
        });

        newSocket.on('video-status-updated', ({ socketId, videoActive }) => {
            setParticipants(prev => prev.map(p => 
                p.socketId === socketId ? { ...p, videoActive } : p
            ));
        });

        newSocket.on('recent-messages', (list) => setMessages(list));
        newSocket.on('new-message', (msg) => setMessages(prev => [...prev, msg]));

        return () => {
            newSocket.disconnect();
            peersRef.current.forEach(p => p.destroy());
        };
    }, [session?.user]); // Added session.user dependency for auto re-join

    const createPeer = (targetId: string, socket: Socket, stream: MediaStream, initiator: boolean, incomingSignal?: Peer.SignalData) => {
        if (typeof window === 'undefined' || !(window as any).Buffer) {
            console.error('[Comm] Buffer not found! WebRTC might fail.');
        }

        const PeerClass = (Peer as any).default || Peer;
        const peer = new PeerClass({
            initiator,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal: Peer.SignalData) => {
            const eventName = activeRoomTypeRef.current === 'video' ? 'video-signal' : 'voice-signal';
            socket.emit(eventName, { targetId, signal });
        });

        peer.on('stream', (remoteStream: MediaStream) => {
            console.log('[Comm] Received remote stream from:', targetId);
            setRemoteStreams(prev => new Map(prev).set(targetId, remoteStream));
        });

        peer.on('error', (err: Error) => console.error('[Peer Error]:', err));
        
        if (incomingSignal) {
            peer.signal(incomingSignal);
        }

        peersRef.current.set(targetId, peer);
        return peer;
    };

    // ------------------------------------------------------------------------------------------------
    // RECOVERY: Load active room from localStorage on mount
    // ------------------------------------------------------------------------------------------------
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedRoom = localStorage.getItem('comm_active_room');
            const savedType = localStorage.getItem('comm_active_type');
            if (savedRoom && savedType && session?.user) {
                console.log('[Comm] Found saved room session:', savedRoom);
                // Wait for socket to be ready
                const timer = setTimeout(() => {
                    if (socketRef.current?.connected) {
                        joinRoom(savedRoom, savedType as any);
                    }
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [session?.user]);

    // ------------------------------------------------------------------------------------------------
    // HEARTBEAT: Ensure server persistent presence every 15s
    // ------------------------------------------------------------------------------------------------
    useEffect(() => {
        if (!socketRef.current || !activeRoom || !session?.user) return;

        const heartbeatInterval = setInterval(() => {
            if (socketRef.current?.connected) {
                socketRef.current.emit('room-heartbeat', {
                    roomId: activeRoom.trim().toLowerCase(),
                    user: {
                        id: (session.user as any).id || session.user.email,
                        name: session.user.name,
                        role: (session.user as any).role,
                    }
                });
            }
        }, 15000);

        return () => clearInterval(heartbeatInterval);
    }, [activeRoom, session?.user]);

    const joinRoom = async (roomId: string, type: "voice" | "video" | "chat") => {
        if (!socketRef.current || !session?.user) {
            console.warn('[Comm] Cannot join room: Socket or Session missing');
            return;
        }
        
        // Standardize Room ID: Lowecase + Trim
        const cleanRoomId = roomId.trim().toLowerCase();
        const userData = {
            id: (session.user as any).id || session.user.email,
            name: session.user.name || 'Anonymous',
            role: (session.user as any).role || 'User',
        };

        // Persist to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('comm_active_room', cleanRoomId);
            localStorage.setItem('comm_active_type', type);
        }

        // Optimistic UI Update: Add self immediately to both participants list and room counts
        setParticipants([{
            ...userData,
            socketId: socketRef.current.id,
            micActive: true,
            videoActive: type === 'video'
        }]);
        setRoomCounts(prev => ({
            ...prev,
            [cleanRoomId]: Math.max((prev[cleanRoomId] || 0), 1)
        }));
        setMessages([]);

        try {
            console.log(`[Comm] Attempting to join ${type} room (standardized): ${cleanRoomId}`);
            let stream = null;
            if (type === 'voice' || type === 'video') {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true, 
                    video: type === 'video' 
                });
                setLocalStream(stream);
                localStreamRef.current = stream;
                setIsMicMuted(false);
                setIsVideoOn(type === 'video');
            }

            socketRef.current.emit('join-room', {
                roomId: cleanRoomId,
                user: userData
            });

            setActiveRoom(cleanRoomId);
            activeRoomRef.current = cleanRoomId;
            setActiveRoomType(type);
            activeRoomTypeRef.current = type;
            toast.success(`Joined room: ${roomId}`); // Keep original name for display toast
        } catch (err) {
            console.error('[Media Access Error]:', err);
            toast.error('Failed to access camera/microphone. Please check permissions.');
            // Clear persistence on failure
            if (typeof window !== 'undefined') {
                localStorage.removeItem('comm_active_room');
                localStorage.removeItem('comm_active_type');
            }
        }
    };


    const leaveRoom = () => {
        if (socketRef.current && activeRoomRef.current) {
            socketRef.current.emit('leave-room', activeRoomRef.current);
            
            // Clear persistence
            if (typeof window !== 'undefined') {
                localStorage.removeItem('comm_active_room');
                localStorage.removeItem('comm_active_type');
            }

            setActiveRoom(null);
            activeRoomRef.current = null;
            setActiveRoomType(null);
            activeRoomTypeRef.current = null;
            setParticipants([]);
            setMessages([]);
            
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                setLocalStream(null);
                localStreamRef.current = null;
            }

            peersRef.current.forEach(peer => peer.destroy());
            peersRef.current.clear();
            setRemoteStreams(new Map());
            toast.success('Left room');
        }
    };

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicMuted(!audioTrack.enabled);

                if (socketRef.current && activeRoomRef.current) {
                    socketRef.current.emit('toggle-mic', {
                        roomId: activeRoomRef.current,
                        micActive: audioTrack.enabled
                    });
                }
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(videoTrack.enabled);

                if (socketRef.current && activeRoomRef.current) {
                    socketRef.current.emit('toggle-video', {
                        roomId: activeRoomRef.current,
                        videoActive: videoTrack.enabled
                    });
                }
            }
        }
    };

    const sendMessage = (text: string) => {
        if (socketRef.current && activeRoomRef.current && session?.user) {
            socketRef.current.emit('send-message', {
                roomId: activeRoomRef.current,
                text,
                user: {
                    id: (session.user as any).id,
                    name: session.user.name,
                    role: (session.user as any).role,
                }
            });
        }
    };

    return (
        <CommunicationContext.Provider value={{
            socket,
            activeRoom,
            activeRoomType,
            participants,
            messages,
            roomCounts,
            localStream,
            remoteStreams,
            isMicMuted,
            isVideoOn,
            joinRoom,
            leaveRoom,
            toggleMic,
            toggleVideo,
            sendMessage
        }}>
            {children}
            {/* Hidden audio elements for remote voice only streams */}
            {activeRoomType === 'voice' && Array.from(remoteStreams.entries()).map(([id, stream]) => (
                <RemoteAudio key={id} stream={stream} />
            ))}
        </CommunicationContext.Provider>
    );
};

const RemoteAudio: React.FC<{ stream: MediaStream }> = ({ stream }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay />;
};

export const useCommunication = () => {
    const context = useContext(CommunicationContext);
    if (!context) {
        throw new Error('useCommunication must be used within a CommunicationProvider');
    }
    return context;
};
