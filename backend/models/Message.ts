import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
    sender: {
        id: string;
        name: string;
        role: string;
    };
    roomId: string;
    text: string;
    createdAt: Date;
}

const MessageSchema: Schema = new Schema({
    sender: {
        id: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
    },
    roomId: { type: String, required: true },
    text: { type: String, required: true },
}, { timestamps: true });

// Index for quick message retrieval by room
MessageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
