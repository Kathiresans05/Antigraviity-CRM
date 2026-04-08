import mongoose from "mongoose";

const ScreenshotSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    employeeName: { type: String, required: true },
    imageUrl: { type: String, required: true }, // Base64 or local path
    activeApp: { type: String },
    windowTitle: { type: String },
    capturedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Screenshot = mongoose.models.Screenshot || mongoose.model("Screenshot", ScreenshotSchema);
