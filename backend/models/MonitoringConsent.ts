import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringConsent extends Document {
  employeeId: mongoose.Types.ObjectId;
  consentAccepted: boolean;
  consentText: string;
  acceptedAt: Date;
  appVersion: string;
}

const MonitoringConsentSchema: Schema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  consentAccepted: { type: Boolean, default: false },
  consentText: { type: String, required: true },
  acceptedAt: { type: Date, default: Date.now },
  appVersion: { type: String, required: true }
}, { timestamps: false });

export default mongoose.models.MonitoringConsent || mongoose.model<IMonitoringConsent>("MonitoringConsent", MonitoringConsentSchema);
