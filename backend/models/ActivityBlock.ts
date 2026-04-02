import mongoose, { Schema, Document } from "mongoose";

export interface IActivityBlock extends Document {
  employeeId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  blockStart: Date;
  blockEnd: Date;
  keyboardCount: number;
  mouseCount: number;
  idleSeconds: number;
  activeSeconds: number;
  status: "Active" | "Idle" | "Away";
  createdAt: Date;
}

const ActivityBlockSchema: Schema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: "MonitoringSession", required: true },
  blockStart: { type: Date, required: true },
  blockEnd: { type: Date, required: true },
  keyboardCount: { type: Number, default: 0 },
  mouseCount: { type: Number, default: 0 },
  idleSeconds: { type: Number, default: 0 },
  activeSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ["Active", "Idle", "Away"], default: "Active" }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.models.ActivityBlock || mongoose.model<IActivityBlock>("ActivityBlock", ActivityBlockSchema);
