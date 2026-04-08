import mongoose from "mongoose";

const ActivityRecordSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    employeeName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    activeApp: { type: String },
    windowTitle: { type: String },
    mouseClicks: { type: Number, default: 0 },
    keystrokes: { type: Number, default: 0 },
    idleSeconds: { type: Number, default: 0 },
    activeSeconds: { type: Number, default: 0 },
    isIdle: { type: Boolean, default: false }
}, { timestamps: true });

export const ActivityRecord = mongoose.models.ActivityRecord || mongoose.model("ActivityRecord", ActivityRecordSchema);
