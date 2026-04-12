import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringAuditLog extends Document {
  // Common Fields
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  action: "view_start" | "view_stop" | "alert_acknowledge" | "settings_update" | "report_generate";
  
  // Live Monitoring Specific
  viewPurpose?: string; 
  startTime?: Date;
  endTime?: Date;
  durationSeconds?: number;
  
  // General Metadata
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const MonitoringAuditLogSchema: Schema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  adminName: { type: String, required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: "User" },
  employeeName: { type: String, required: true },
  action: { 
    type: String, 
    enum: ["view_start", "view_stop", "alert_acknowledge", "settings_update", "report_generate"], 
    required: true 
  },
  viewPurpose: { type: String },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  durationSeconds: { type: Number },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.models.MonitoringAuditLog || mongoose.model<IMonitoringAuditLog>("MonitoringAuditLog", MonitoringAuditLogSchema);
