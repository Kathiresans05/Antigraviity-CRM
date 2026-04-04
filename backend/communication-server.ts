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

io.on("connection", (socket: Socket) => {
    console.log("[Socket] New connection:", socket.id);

    socket.on("join-room", ({ roomId: rawRoomId, user }: { roomId: string, user: any }) => {
        const roomId = rawRoomId.trim();
        console.log(`[Socket] User ${user.name} (${user.role}) joining room: "${roomId}" (ID: ${socket.id})`);
        
        socket.join(roomId);
        
        if (!activeRooms.has(roomId)) {
            activeRooms.set(roomId, new Map());
        }
        
        const participants = activeRooms.get(roomId)!;
        participants.set(socket.id, {
            ...user,
            socketId: socket.id,
            micActive: true
        });

        const currentParticipants = Array.from(participants.values());
        console.log(`[CommServer] Room "${roomId}" now has ${currentParticipants.length} participants`);

        // Broadcast FULL list to everyone in the room (including sender)
        io.to(roomId).emit("room-update", currentParticipants);

        // Notify others in the room (Legacy support)
        socket.to(roomId).emit("user-connected", {
            socketId: socket.id,
            user: participants.get(socket.id)
        });

        // Send current list to the new user (Legacy support)
        socket.emit("room-participants", currentParticipants);

        // Broadcast global presence to everyone
        broadcastGlobalPresence();

        // If it's a chat room, load recent messages
        loadRecentMessages(roomId, socket);
    });

    socket.on("send-message", async ({ roomId, text, user }: { roomId: string, text: string, user: any }) => {
        try {
            const Message = mongoose.models.Message || mongoose.model("Message", new mongoose.Schema({
                sender: { id: String, name: String, role: String },
                roomId: String,
                text: String
            }, { timestamps: true }));

            const newMessage = new Message({
                sender: user,
                roomId: roomId.trim(),
                text
            });

            await newMessage.save();

            // Broadcast to everyone in the room (including sender)
            io.to(roomId.trim()).emit("new-message", {
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

    socket.on("toggle-mic", ({ roomId, micActive }: { roomId: string, micActive: boolean }) => {
        const rId = roomId.trim();
        const participants = activeRooms.get(rId);
        if (participants && participants.has(socket.id)) {
            participants.get(socket.id).micActive = micActive;
            io.to(rId).emit("mic-status-updated", {
                socketId: socket.id,
                micActive
            });
        }
    });

    socket.on("toggle-video", ({ roomId, videoActive }: { roomId: string, videoActive: boolean }) => {
        const rId = roomId.trim();
        const participants = activeRooms.get(rId);
        if (participants && participants.has(socket.id)) {
            participants.get(socket.id).videoActive = videoActive;
            io.to(rId).emit("video-status-updated", {
                socketId: socket.id,
                videoActive
            });
        }
    });

    socket.on("leave-room", (roomId: string) => {
        handleLeave(socket, roomId.trim());
    });

    socket.on("disconnect", () => {
        console.log("[Socket] Disconnected:", socket.id);
        activeRooms.forEach((participants, roomId) => {
            if (participants.has(socket.id)) {
                handleLeave(socket, roomId);
            }
        });
    });

    // Send initial global presence
    socket.emit("global-room-presence", getGlobalPresence());
});

function getGlobalPresence() {
    const presence: Record<string, number> = {};
    activeRooms.forEach((participants, roomId) => {
        presence[roomId] = participants.size;
    });
    return presence;
}

function broadcastGlobalPresence() {
    io.emit("global-room-presence", getGlobalPresence());
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

function handleLeave(socket: Socket, roomId: string) {
    const rId = roomId.trim();
    const participants = activeRooms.get(rId);
    if (participants) {
        participants.delete(socket.id);
        socket.to(rId).emit("user-disconnected", socket.id);
        socket.leave(rId);
        
        // Broadcast FULL updated list to remaining users
        const remainingParticipants = Array.from(participants.values());
        io.to(rId).emit("room-update", remainingParticipants);
        
        if (participants.size === 0) {
            activeRooms.delete(rId);
        }
        broadcastGlobalPresence();
    }
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

httpServer.listen(PORT, () => {
    console.log(`[CommServer] Signaling server running on port ${PORT}`);
});
