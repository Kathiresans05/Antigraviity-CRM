import mongoose, { Schema, Document } from "mongoose";

export interface IRoom extends Document {
    name: string;
    type: "voice" | "video";
    allowedRoles: string[];
    isFixed: boolean;
    createdAt: Date;
}

const RoomSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    type: { type: String, enum: ["voice", "video"], default: "voice" },
    allowedRoles: [{ type: String }],
    isFixed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);
