import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  action: "view_start" | "view_stop" | "alert_acknowledge" | "settings_update";
  viewPurpose?: string; // Reason provided by admin before viewing
  startTime: Date;
  endTime?: Date;
  durationSeconds?: number;
  ipAddress?: string;
  metadata?: any;
}

const MonitoringAuditLogSchema: Schema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  adminName: { type: String, required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: "User" },
  employeeName: { type: String, required: true },
  action: { type: String, enum: ["view_start", "view_stop", "alert_acknowledge", "settings_update"], required: true },
  viewPurpose: { type: String },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  durationSeconds: { type: Number },
  ipAddress: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.models.MonitoringAuditLog || mongoose.model<IMonitoringAuditLog>("MonitoringAuditLog", MonitoringAuditLogSchema);
