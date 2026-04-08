import mongoose from "mongoose";

const MonitoringAlertSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    employeeName: { type: String, required: true },
    type: { type: String, enum: ['idle', 'suspicious_activity', 'blocked_app'], required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const MonitoringAlert = mongoose.models.MonitoringAlert || mongoose.model("MonitoringAlert", MonitoringAlertSchema);
