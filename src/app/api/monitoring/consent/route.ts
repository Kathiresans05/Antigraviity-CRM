import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import dbConnect from "@/backend/lib/mongodb";
import mongoose from "mongoose";

// Simple Consent model since it was missing
const ConsentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  accepted: { type: Boolean, default: false },
  appVersion: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const MonitoringConsent = mongoose.models.MonitoringConsent || mongoose.model("MonitoringConsent", ConsentSchema);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { accepted, appVersion, text } = await req.json();
    await dbConnect();

    await MonitoringConsent.findOneAndUpdate(
      { employeeId: (session.user as any).id },
      { accepted, appVersion, text, timestamp: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("MONITORING_CONSENT_ERROR:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
