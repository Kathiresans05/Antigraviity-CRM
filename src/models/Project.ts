import mongoose, { Document, Model } from "mongoose";

export interface IProject extends Document {
    name: string;
    client: string;
    startDate: string;
    endDate: string;
    status: string;
    progress: number;
    team: number;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        client: { type: String, required: true },
        startDate: { type: String, required: true },
        endDate: { type: String, required: true },
        status: { type: String, required: true, default: "In Progress" },
        progress: { type: Number, default: 0 },
        team: { type: Number, default: 1 },
    },
    { timestamps: true }
);

const Project: Model<IProject> =
    mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
