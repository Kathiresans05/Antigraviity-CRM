import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringSetting extends Document {
  isTrackingEnabled: boolean;
  idleThresholdSeconds: number;
  blockDurationMinutes: number;
  dataRetentionDays: number;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const MonitoringSettingSchema: Schema = new Schema({
  isTrackingEnabled: { type: Boolean, default: true },
  idleThresholdSeconds: { type: Number, default: 300 }, // 5 mins
  blockDurationMinutes: { type: Number, default: 5 },
  dataRetentionDays: { type: Number, default: 90 },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: { createdAt: false, updatedAt: true } });

export default mongoose.models.MonitoringSetting || mongoose.model<IMonitoringSetting>("MonitoringSetting", MonitoringSettingSchema);
