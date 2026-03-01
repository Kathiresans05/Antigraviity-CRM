import mongoose, { Schema, Document } from "mongoose";

export interface IAnnouncement extends Document {
    title: string;
    content: string;
    author: string;
    authorId: mongoose.Types.ObjectId;
    priority: "General" | "Important" | "Urgent";
    status: "Broadcasted" | "Active" | "Scheduled";
    reach: string;
    viewedBy: mongoose.Types.ObjectId[];
    date: Date;
    includeCrmLink: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AnnouncementSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        author: {
            type: String,
            required: true,
        },
        authorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        priority: {
            type: String,
            enum: ["General", "Important", "Urgent"],
            default: "General",
        },
        status: {
            type: String,
            enum: ["Broadcasted", "Active", "Scheduled"],
            default: "Broadcasted",
        },
        reach: {
            type: String,
            default: "0%",
        },
        viewedBy: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        date: {
            type: Date,
            default: Date.now,
        },
        includeCrmLink: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Announcement || mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
