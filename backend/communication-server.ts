import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
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

    socket.on("join-room", ({ roomId, user }: { roomId: string, user: any }) => {
        console.log(`[Socket] User ${user.name} joining room ${roomId}`);
        
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

        // Notify others in the room
        const currentParticipants = Array.from(participants.values());
        socket.to(roomId).emit("user-connected", {
            socketId: socket.id,
            user: participants.get(socket.id)
        });

        // Send current list to the new user
        socket.emit("room-participants", currentParticipants);
    });

    socket.on("voice-signal", ({ targetId, signal }: { targetId: string, signal: any }) => {
        io.to(targetId).emit("voice-signal", {
            senderId: socket.id,
            signal
        });
    });

    socket.on("toggle-mic", ({ roomId, micActive }: { roomId: string, micActive: boolean }) => {
        const participants = activeRooms.get(roomId);
        if (participants && participants.has(socket.id)) {
            participants.get(socket.id).micActive = micActive;
            io.to(roomId).emit("mic-status-updated", {
                socketId: socket.id,
                micActive
            });
        }
    });

    socket.on("leave-room", (roomId: string) => {
        handleLeave(socket, roomId);
    });

    socket.on("disconnect", () => {
        console.log("[Socket] Disconnected:", socket.id);
        activeRooms.forEach((participants, roomId) => {
            if (participants.has(socket.id)) {
                handleLeave(socket, roomId);
            }
        });
    });
});

function handleLeave(socket: Socket, roomId: string) {
    const participants = activeRooms.get(roomId);
    if (participants) {
        participants.delete(socket.id);
        socket.to(roomId).emit("user-disconnected", socket.id);
        socket.leave(roomId);
        
        if (participants.size === 0) {
            activeRooms.delete(roomId);
        }
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
            { name: "Admin Room", type: "voice", allowedRoles: ["Admin", "HR", "HR Manager"], isFixed: true },
            { name: "Manager Room", type: "voice", allowedRoles: ["Admin", "Manager", "Assigned Manager"], isFixed: true },
            { name: "TL Room", type: "voice", allowedRoles: ["Admin", "Manager", "TL"], isFixed: true },
            { name: "Employee Room", type: "voice", allowedRoles: ["Admin", "Manager", "TL", "Employee"], isFixed: true },
            { name: "General Lounge", type: "voice", allowedRoles: [], isFixed: true }
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
