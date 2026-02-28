import mongoose, { Schema, Document } from "mongoose";

export interface IDocument extends Document {
    name: string;
    type: string;
    size: number;
    category: string;
    owner: string;
    ownerId: mongoose.Types.ObjectId;
    fileUrl: string;
    createdAt: Date;
    updatedAt: Date;
}

const documentSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        size: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            required: true,
            index: true,
        },
        owner: {
            type: String,
            required: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Document || mongoose.model<IDocument>("Document", documentSchema);
