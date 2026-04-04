import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT =process.env.COMMUNICATION_PORT || 3001;

// Database Connection for Room validation/seeding
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI).then(() => {
        console.log("[CommServer] Connected to MongoDB");
        seedRooms();
    }).catch(err => console.error("[CommServer] MongoDB Connection Error:", err));
}

// Room data in-memory for active sessions
// Map<roomId, Map<socketId, {userId, name, role, micActive}>>
const activeRooms = new Map<string, Map<string, any>>();

// Participant Schema for persistent presence
const ParticipantSchema = new mongoose.Schema({
    roomId: String,
    socketId: String,
    userId: String,
    name: String,
    role: String,
    micActive: { type: Boolean, default: true },
    videoActive: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
});
const Participant = mongoose.models.Participant || mongoose.model("Participant", ParticipantSchema);

// Clear stale participants on startup
async function cleanupStaleParticipants() {
    try {
        await Participant.deleteMany({});
        console.log("[CommServer] Stale participants cleared from MongoDB");
    } catch (err) {
        console.error("[CommServer] Cleanup failed:", err);
    }
}

io.on("connection", (socket: Socket) => {
    console.log("[Socket] New connection:", socket.id);

    socket.on("join-room", async ({ roomId: rawRoomId, user }: { roomId: string, user: any }) => {
        const roomId = rawRoomId.trim().toLowerCase();
        console.log(`[Socket] User ${user.name} (${user.role}) joining room: "${roomId}" (ID: ${socket.id})`);
        
        socket.join(roomId);
        
        await Participant.findOneAndUpdate(
            { socketId: socket.id },
            { 
                roomId, 
                socketId: socket.id, 
                userId: user.id || user.email, 
                name: user.name, 
                role: user.role,
                micActive: true,
                lastHeartbeat: new Date()
            },
            { upsert: true, new: true }
        );

        // Update In-Memory for fallback
        if (!activeRooms.has(roomId)) {
            activeRooms.set(roomId, new Map());
        }
        const participantsMap = activeRooms.get(roomId)!;
        participantsMap.set(socket.id, { ...user, socketId: socket.id, micActive: true });

        // Broadcast FULL list from MongoDB with DE-DUPLICATION
        await broadcastRoomUpdate(roomId);

        // Broadcast global presence to everyone
        broadcastGlobalPresence();

        // If it's a chat room, load recent messages
        loadRecentMessages(roomId, socket);
    });

    socket.on("send-message", async ({ roomId, text, user }: { roomId: string, text: string, user: any }) => {
        try {
            const rId = roomId.trim().toLowerCase();
            const Message = mongoose.models.Message || mongoose.model("Message", new mongoose.Schema({
                sender: { id: String, name: String, role: String },
                roomId: String,
                text: String
            }, { timestamps: true }));

            const newMessage = new Message({
                sender: user,
                roomId: rId,
                text
            });

            await newMessage.save();

            // Broadcast to everyone in the room (including sender)
            io.to(rId).emit("new-message", {
                id: newMessage._id,
                sender: user,
                text,
                createdAt: newMessage.createdAt
            });
        } catch (err) {
            console.error("[CommServer] Message failed:", err);
        }
    });

    socket.on("voice-signal", ({ targetId, signal }: { targetId: string, signal: any }) => {
        io.to(targetId).emit("voice-signal", {
            senderId: socket.id,
            signal
        });
    });

    socket.on("video-signal", ({ targetId, signal }: { targetId: string, signal: any }) => {
        io.to(targetId).emit("video-signal", {
            senderId: socket.id,
            signal
        });
    });

    socket.on("toggle-mic", async ({ roomId, micActive }: { roomId: string, micActive: boolean }) => {
        const rId = roomId.trim().toLowerCase();
        await Participant.findOneAndUpdate({ socketId: socket.id }, { micActive });
        io.to(rId).emit("mic-status-updated", {
            socketId: socket.id,
            micActive
        });
    });

    socket.on("toggle-video", async ({ roomId, videoActive }: { roomId: string, videoActive: boolean }) => {
        const rId = roomId.trim().toLowerCase();
        await Participant.findOneAndUpdate({ socketId: socket.id }, { videoActive });
        io.to(rId).emit("video-status-updated", {
            socketId: socket.id,
            videoActive
        });
    });

    socket.on("leave-room", async (roomId: string) => {
        await handleLeave(socket, roomId.trim().toLowerCase());
    });

    socket.on("disconnect", async () => {
        console.log("[Socket] Disconnected:", socket.id);
        
        // Find which room the participant was in before removing
        const participant = await Participant.findOne({ socketId: socket.id });
        if (participant) {
            await handleLeave(socket, participant.roomId);
        }
    });

    socket.on("room-heartbeat", async ({ roomId: rawRoomId, user }: { roomId: string, user: any }) => {
        const roomId = rawRoomId.trim().toLowerCase();
        socket.join(roomId);

        await Participant.findOneAndUpdate(
            { socketId: socket.id },
            { 
                roomId, 
                socketId: socket.id, 
                userId: user.id || user.email, 
                name: user.name, 
                role: user.role,
                lastHeartbeat: new Date()
            },
            { upsert: true, new: true }
        );

        if (!activeRooms.has(roomId)) {
            activeRooms.set(roomId, new Map());
        }
        const participantsMap = activeRooms.get(roomId)!;
        if (!participantsMap.has(socket.id)) {
            participantsMap.set(socket.id, { ...user, socketId: socket.id, micActive: true });
            
            // Re-broadcast de-duplicated list
            await broadcastRoomUpdate(roomId);
            broadcastGlobalPresence();
        }
    });

    // Send initial global presence
    broadcastGlobalPresence().then(presence => {
        socket.emit("global-room-presence", presence);
    });
});

async function broadcastRoomUpdate(roomId: string) {
    const rId = roomId.trim().toLowerCase();
    // Fetch all participants and DE-DUPLICATE by userId
    const allParticipants = await Participant.find({ roomId: rId });
    
    const uniqueParticipants = Array.from(
        allParticipants.reduce((map, p) => {
            // Keep the most recent record or the one with the specific socketId
            const key = p.userId || p.socketId;
            if (!map.has(key)) map.set(key, p);
            return map;
        }, new Map()).values()
    );

    io.to(rId).emit("room-update", uniqueParticipants);
}

async function getGlobalPresence() {
    const presence: Record<string, number> = {};
    const stats = await Participant.aggregate([
        { $group: { _id: "$roomId", count: { $sum: 1 } } }
    ]);
    stats.forEach(stat => {
        presence[stat._id] = stat.count;
    });
    return presence;
}

async function broadcastGlobalPresence() {
    const presence = await getGlobalPresence();
    io.emit("global-room-presence", presence);
    return presence;
}

async function loadRecentMessages(roomId: string, socket: Socket) {
    try {
        const Message = mongoose.models.Message || mongoose.model("Message", new mongoose.Schema({
            sender: { id: String, name: String, role: String },
            roomId: String,
            text: String
        }, { timestamps: true }));

        const messages = await Message.find({ roomId: roomId.trim() }).sort({ createdAt: -1 }).limit(50);
        socket.emit("recent-messages", messages.reverse());
    } catch (err) {
        console.error("[CommServer] Failed to load messages:", err);
    }
}

async function handleLeave(socket: Socket, roomId: string) {
    const rId = roomId.trim();
    
    // Remove from MongoDB
    await Participant.deleteOne({ socketId: socket.id });
    
    // Fallback In-Memory cleanup
    const participantsMap = activeRooms.get(rId);
    if (participantsMap) {
        participantsMap.delete(socket.id);
        if (participantsMap.size === 0) activeRooms.delete(rId);
    }

    socket.to(rId).emit("user-disconnected", socket.id);
    socket.leave(rId);
    
    // Broadcast FULL updated list from MongoDB
    const remainingParticipants = await Participant.find({ roomId: rId });
    io.to(rId).emit("room-update", remainingParticipants);
    
    broadcastGlobalPresence();
}


async function seedRooms() {
    try {
        const Room = mongoose.models.Room || mongoose.model("Room", new mongoose.Schema({
            name: String,
            type: String,
            allowedRoles: [String],
            isFixed: Boolean
        }));

        const defaultRooms = [
            // Voice
            { name: "Admin Voice", type: "voice", allowedRoles: ["Admin"], isFixed: true },
            { name: "Team Sync (Voice)", type: "voice", allowedRoles: [], isFixed: true },
            // Video
            { name: "Board Room (Video)", type: "video", allowedRoles: ["Admin", "HR", "Manager"], isFixed: true },
            { name: "General Meet (Video)", type: "video", allowedRoles: [], isFixed: true },
            // Chat
            { name: "General Chat", type: "chat", allowedRoles: [], isFixed: true },
            { name: "Hiring Strategy", type: "chat", allowedRoles: ["Admin", "HR"], isFixed: true },
            { name: "Dev Lounge", type: "chat", allowedRoles: ["Admin", "Manager", "TL"], isFixed: true }
        ];

        for (const room of defaultRooms) {
            await Room.findOneAndUpdate(
                { name: room.name },
                room,
                { upsert: true, new: true }
            );
        }
        console.log("[CommServer] Default rooms seeded");
    } catch (err) {
        console.error("[CommServer] Seeding failed:", err);
    }
}

async function startServer() {
    await cleanupStaleParticipants();
    
    // Periodically clean up "zombie" participants who missed heartbeats (> 45s)
    setInterval(async () => {
        const threshold = new Date(Date.now() - 45000);
        const stale = await Participant.find({ lastHeartbeat: { $lt: threshold } });
        for (const p of stale) {
            console.log(`[CommServer] Cleaning up stale participant: ${p.name}`);
            await Participant.deleteOne({ _id: p._id });
            broadcastGlobalPresence();
        }
    }, 30000);

    httpServer.listen(PORT, () => {
        console.log(`[CommServer] Signaling server running on port ${PORT}`);
    });
}

startServer();
