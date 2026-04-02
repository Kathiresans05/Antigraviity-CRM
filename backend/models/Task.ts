import mongoose, { Document, Model } from "mongoose";

export interface ITask extends Document {
    title: string;
    project: string;
    status: string;
    priority: string;
    due: string;
    assignedTo: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const TaskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        project: { type: String, required: true },
        status: { type: String, required: true, default: "To Do" },
        priority: { type: String, default: "Medium" },
        due: { type: String },
        assignedTo: { type: String },
        createdBy: { type: String },
    },
    { timestamps: true }
);

const Task: Model<ITask> =
    mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default Task;
