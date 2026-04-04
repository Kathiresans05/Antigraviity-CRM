"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface CommunicationContextType {
    socket: Socket | null;
    activeRoom: string | null;
    participants: any[];
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    isMicMuted: boolean;
    joinRoom: (roomId: string) => Promise<void>;
    leaveRoom: () => void;
    toggleMic: () => void;
}

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMicMuted, setIsMicMuted] = useState(false);

    const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_COMMUNICATION_URL || 'http://localhost:3001';
        const newSocket = io(socketUrl);
        setSocket(newSocket);
        socketRef.current = newSocket;

        newSocket.on('user-connected', ({ socketId, user }) => {
            console.log('[Comm] User connected:', user.name);
            setParticipants(prev => [...prev, { ...user, socketId }]);
            // If we are already in a room, initiate WebRTC with new user
            if (activeRoom && localStream) {
                createPeer(socketId, newSocket, localStream, true);
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

        newSocket.on('voice-signal', ({ senderId, signal }) => {
            if (peersRef.current.has(senderId)) {
                peersRef.current.get(senderId)?.signal(signal);
            } else if (activeRoom && localStream) {
                // Someone is calling us, create a peer as receiver
                createPeer(senderId, newSocket, localStream, false, signal);
            }
        });

        newSocket.on('mic-status-updated', ({ socketId, micActive }) => {
            setParticipants(prev => prev.map(p => 
                p.socketId === socketId ? { ...p, micActive } : p
            ));
        });

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
            socket.emit('voice-signal', { targetId, signal });
        });

        peer.on('stream', (remoteStream: MediaStream) => {
            console.log('[Comm] Received remote stream from:', targetId);
            setRemoteStreams(prev => new Map(prev).set(targetId, remoteStream));
        });

        peer.on('error', (err: Error) => console.error('[Peer Error]:', err));
        peer.on('close', () => {
            console.log('[Peer] Connection closed with:', targetId);
        });

        if (incomingSignal) {
            peer.signal(incomingSignal);
        }

        peersRef.current.set(targetId, peer);
        return peer;
    };

    const joinRoom = async (roomId: string) => {
        if (!socketRef.current || !session?.user) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            socketRef.current.emit('join-room', {
                roomId,
                user: {
                    id: (session.user as any).id,
                    name: session.user.name,
                    role: (session.user as any).role,
                }
            });

            setActiveRoom(roomId);
            toast.success(`Joined room: ${roomId}`);
        } catch (err) {
            console.error('[Mic Access Error]:', err);
            toast.error('Failed to access microphone. Please check permissions.');
        }
    };

    const leaveRoom = () => {
        if (socketRef.current && activeRoom) {
            socketRef.current.emit('leave-room', activeRoom);
            setActiveRoom(null);
            setParticipants([]);
            
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
            }

            peersRef.current.forEach(peer => peer.destroy());
            peersRef.current.clear();
            setRemoteStreams(new Map());
            toast.success('Left room');
        }
    };

    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            setIsMicMuted(!audioTrack.enabled);

            if (socketRef.current && activeRoom) {
                socketRef.current.emit('toggle-mic', {
                    roomId: activeRoom,
                    micActive: audioTrack.enabled
                });
            }
        }
    };

    return (
        <CommunicationContext.Provider value={{
            socket,
            activeRoom,
            participants,
            localStream,
            remoteStreams,
            isMicMuted,
            joinRoom,
            leaveRoom,
            toggleMic
        }}>
            {children}
            {/* Hidden audio elements for remote streams */}
            {Array.from(remoteStreams.entries()).map(([id, stream]) => (
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
