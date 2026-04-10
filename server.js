const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3001;
const app = next({ dev });
const handle = app.getRequestHandler();

const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Schema for Participants (Internal to server.js for portability)
const participantSchema = new mongoose.Schema({
    socketId: String,
    userId: String,
    name: String,
    role: String,
    roomId: String,
    micActive: { type: Boolean, default: true },
    videoActive: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now }
});

const Participant = mongoose.models.Participant || mongoose.model('Participant', participantSchema);

// MongoDB Schema for Rooms (Internal)
const roomSchema = new mongoose.Schema({
    roomId: { type: String, unique: true },
    name: String,
    type: { type: String, enum: ['voice', 'video', 'chat'] },
    isPublic: { type: Boolean, default: true }
});

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

// Connect to MongoDB
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('[Server] Connected to MongoDB'))
        .catch(err => console.error('[Server] MongoDB connection error:', err));
}

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // --- Signaling Logic ---

    const broadcastRoomUpdate = async (roomId) => {
        const roomIdLower = roomId.toLowerCase();
        const participants = await Participant.find({ roomId: roomIdLower });
        io.to(roomIdLower).emit("room-update", participants);
    };

    const getGlobalSyncData = async () => {
        const allParticipants = await Participant.find({});
        const globalCounts = {};
        const roomStates = {};

        allParticipants.forEach(p => {
            if (!globalCounts[p.roomId]) globalCounts[p.roomId] = 0;
            globalCounts[p.roomId]++;

            if (!roomStates[p.roomId]) roomStates[p.roomId] = [];
            roomStates[p.roomId].push(p);
        });

        return { globalCounts, roomStates };
    };

    const broadcastGlobalPresence = async () => {
        const syncData = await getGlobalSyncData();
        io.emit("global-presence-sync", syncData);
    };

    io.on('connection', (socket) => {
        console.log('[Socket] New connection:', socket.id);

        socket.on('join-room', async ({ roomId, user }) => {
            const roomIdLower = roomId.toLowerCase();
            console.log(`[Socket] User ${user.name} joining room: ${roomIdLower}`);
            
            socket.join(roomIdLower);
            
            // Upsert participant
            await Participant.findOneAndUpdate(
                { socketId: socket.id },
                { 
                    userId: user.id, 
                    name: user.name, 
                    role: user.role, 
                    roomId: roomIdLower,
                    micActive: true,
                    videoActive: false,
                    lastSeen: new Date()
                },
                { upsert: true, new: true }
            );

            // Notify others
            socket.to(roomIdLower).emit("user-connected", {
                socketId: socket.id,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    micActive: true,
                    videoActive: false
                }
            });

            await broadcastRoomUpdate(roomIdLower);
            await broadcastGlobalPresence();
        });

        socket.on('leave-room', async (roomId) => {
            const roomIdLower = roomId.toLowerCase();
            console.log(`[Socket] User ${socket.id} leaving room: ${roomIdLower}`);
            socket.leave(roomIdLower);
            await Participant.deleteOne({ socketId: socket.id });
            await broadcastRoomUpdate(roomIdLower);
            await broadcastGlobalPresence();
        });

        socket.on('room-heartbeat', async ({ roomId }) => {
            const roomIdLower = roomId.toLowerCase();
            await Participant.updateOne(
                { socketId: socket.id },
                { lastSeen: new Date() }
            );
        });

        socket.on('voice-signal', ({ targetId, signal }) => {
            io.to(targetId).emit('voice-signal', { senderId: socket.id, signal });
        });

        socket.on('video-signal', ({ targetId, signal }) => {
            io.to(targetId).emit('video-signal', { senderId: socket.id, signal });
        });

        socket.on('send-message', ({ roomId, text, user }) => {
            const roomIdLower = roomId.toLowerCase();
            const message = {
                id: Math.random().toString(36).substr(2, 9),
                text,
                user,
                timestamp: new Date().toISOString()
            };
            io.to(roomIdLower).emit('new-message', message);
        });

        socket.on('toggle-mic', async ({ roomId, micActive }) => {
            const roomIdLower = roomId.toLowerCase();
            await Participant.updateOne({ socketId: socket.id }, { micActive });
            io.to(roomIdLower).emit('mic-status-updated', { socketId: socket.id, micActive });
        });

        socket.on('toggle-video', async ({ roomId, videoActive }) => {
            const roomIdLower = roomId.toLowerCase();
            await Participant.updateOne({ socketId: socket.id }, { videoActive });
            io.to(roomIdLower).emit('video-status-updated', { socketId: socket.id, videoActive });
        });

        socket.on('disconnect', async () => {
            console.log('[Socket] Disconnected:', socket.id);
            const p = await Participant.findOne({ socketId: socket.id });
            if (p) {
                const roomIdLower = p.roomId;
                await Participant.deleteOne({ socketId: socket.id });
                io.to(roomIdLower).emit('user-disconnected', socket.id);
                await broadcastGlobalPresence();
            }
        });
    });

    // --- Monitoring Namespace (CCTV Wall) ---
    const monitoringNamespace = io.of("/monitoring");

    monitoringNamespace.on('connection', (socket) => {
        console.log('[Monitoring-Socket] New connection:', socket.id);

        socket.on('register-agent', (data) => {
            socket.join(`agent-${data.userId}`);
            socket.data.userId = data.userId;
            socket.data.employeeName = data.employeeName;
            console.log(`[Monitoring-Socket] Agent registered: ${data.employeeName} (${data.userId})`);
            
            monitoringNamespace.to("admins").emit("agent-status-change", {
                userId: data.userId,
                status: "online",
                employeeName: data.employeeName
            });
        });

        socket.on('join-admin', () => {
            socket.join("admins");
            console.log("[Monitoring-Socket] Admin joined monitoring wall");
        });

        socket.on('screen-frame', (data) => {
            // Relay frame to all connected admins
            monitoringNamespace.to("admins").emit("screen-update", data);
        });

        socket.on('disconnect', () => {
            if (socket.data.userId) {
                monitoringNamespace.to("admins").emit("agent-status-change", {
                    userId: socket.data.userId,
                    status: "offline"
                });
            }
        });
    });

    // Cleanup stale participants every 60s

    setInterval(async () => {
        const oneMinuteAgo = new Date(Date.now() - 60000);
        await Participant.deleteMany({ lastSeen: { $lt: oneMinuteAgo } });
        await broadcastGlobalPresence();
    }, 30000);

    // Initial seeding of rooms
    const seedRooms = async () => {
        const defaultRooms = [
            { roomId: 'general-meet-video', name: 'General Meet (Video)', type: 'video' },
            { roomId: 'board-room-video', name: 'Board Room (Video)', type: 'video' },
            { roomId: 'lobby-voice', name: 'General Lobby (Voice)', type: 'voice' },
            { roomId: 'tech-support-voice', name: 'Tech Support (Voice)', type: 'voice' }
        ];

        for (const room of defaultRooms) {
            await Room.findOneAndUpdate({ roomId: room.roomId }, room, { upsert: true });
        }
        console.log('[Server] Default rooms ensured');
    };
    seedRooms();

    httpServer.listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
