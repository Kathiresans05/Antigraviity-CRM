import mongoose, { Document, Model } from "mongoose";

export interface ISupportTicket extends Document {
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    createdBy: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String,
            required: true,
            enum: ["IT", "HR", "Facilities", "General"],
            default: "General",
        },
        priority: {
            type: String,
            required: true,
            enum: ["Low", "Medium", "High", "Urgent"],
            default: "Medium",
        },
        status: {
            type: String,
            required: true,
            enum: ["Open", "In Progress", "Resolved", "Closed"],
            default: "Open",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

const SupportTicket: Model<ISupportTicket> =
    mongoose.models.SupportTicket || mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;
