import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringSession extends Document {
  employeeId: mongoose.Types.ObjectId;
  loginTime: Date;
  logoutTime?: Date;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  sessionStatus: "Active" | "Completed";
  createdAt: Date;
  updatedAt: Date;
}

const MonitoringSessionSchema: Schema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  loginTime: { type: Date, default: Date.now },
  logoutTime: { type: Date },
  totalActiveSeconds: { type: Number, default: 0 },
  totalIdleSeconds: { type: Number, default: 0 },
  sessionStatus: { type: String, enum: ["Active", "Completed", "On Break"], default: "Active" }
}, { timestamps: true });

export default mongoose.models.MonitoringSession || mongoose.model<IMonitoringSession>("MonitoringSession", MonitoringSessionSchema);
