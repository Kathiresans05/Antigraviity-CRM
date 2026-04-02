import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import MonitoringSetting from "@/backend/models/MonitoringSetting";
import dbConnect from "@/backend/lib/mongodb";

export async function GET() {
  try {
    await dbConnect();
    const settings = await MonitoringSetting.findOne();
    return NextResponse.json({ settings: settings || { isTrackingEnabled: true, idleThresholdSeconds: 300, blockDurationMinutes: 5 } });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await req.json();
    await dbConnect();

    const settings = await MonitoringSetting.findOneAndUpdate({}, { 
      ...updates, 
      updatedBy: (session.user as any).id 
    }, { upsert: true, new: true });

    return NextResponse.json({ success: true, settings });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
