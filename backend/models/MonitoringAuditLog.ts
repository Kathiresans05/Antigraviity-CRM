import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  actionType: string;
  targetModule: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

const MonitoringAuditLogSchema: Schema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  actorRole: { type: String, required: true },
  actionType: { type: String, required: true },
  targetModule: { type: String, default: "Monitoring" },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.models.MonitoringAuditLog || mongoose.model<IMonitoringAuditLog>("MonitoringAuditLog", MonitoringAuditLogSchema);
