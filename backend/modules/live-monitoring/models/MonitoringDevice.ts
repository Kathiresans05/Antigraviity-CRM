import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringDevice extends Document {
  deviceId: string;
  deviceName: string;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  isOnline: boolean;
  lastHeartbeat: Date;
  status: "active" | "idle" | "offline";
  consentAccepted: boolean;
  consentDate: Date;
  metadata: {
    os: string;
    version: string;
    ip: string;
  };
}

const MonitoringDeviceSchema: Schema = new Schema({
  deviceId: { type: String, required: true, unique: true },
  deviceName: { type: String, required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  employeeName: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastHeartbeat: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "idle", "offline"], default: "offline" },
  consentAccepted: { type: Boolean, default: false },
  consentDate: { type: Date },
  metadata: {
    os: { type: String },
    version: { type: String },
    ip: { type: String }
  }
}, { timestamps: true });

export default mongoose.models.MonitoringDevice || mongoose.model<IMonitoringDevice>("MonitoringDevice", MonitoringDeviceSchema);
