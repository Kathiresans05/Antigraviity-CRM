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

        newSocket.on('user-connected', ({ socketId, user }) => {
            console.log('[Comm] User connected:', user.name);
            setParticipants(prev => {
                // Prevent duplicates
                if (prev.find(p => p.socketId === socketId)) return prev;
                return [...prev, { ...user, socketId, micActive: true, videoActive: true }];
            });
            
            // If we are already in a room with a stream, initiate WebRTC
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
    }, []);

    const createPeer = (targetId: string, socket: Socket, stream: MediaStream, initiator: boolean, incomingSignal?: Peer.SignalData) => {
        const peer = new Peer({
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

    const joinRoom = async (roomId: string, type: "voice" | "video" | "chat") => {
        if (!socketRef.current || !session?.user) return;
        const cleanRoomId = roomId.trim();

        try {
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
                user: {
                    id: (session.user as any).id,
                    name: session.user.name,
                    role: (session.user as any).role,
                }
            });

            setActiveRoom(cleanRoomId);
            activeRoomRef.current = cleanRoomId;
            setActiveRoomType(type);
            activeRoomTypeRef.current = type;
            setParticipants([]);
            setMessages([]);
            toast.success(`Joined room: ${cleanRoomId}`);
        } catch (err) {
            console.error('[Media Access Error]:', err);
            toast.error('Failed to access camera/microphone. Please check permissions.');
        }
    };

    const leaveRoom = () => {
        if (socketRef.current && activeRoomRef.current) {
            socketRef.current.emit('leave-room', activeRoomRef.current);
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
