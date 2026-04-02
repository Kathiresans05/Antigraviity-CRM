import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import ActivityBlock from "@/backend/models/ActivityBlock";
import MonitoringSession from "@/backend/models/MonitoringSession";
import dbConnect from "@/backend/lib/mongodb";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || (session.user as any).id;
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);

    await dbConnect();

    // Basic aggregation for my activity
    const blocks = await ActivityBlock.find({
      employeeId: userId,
      blockStart: { $gte: startDate, $lte: endDate }
    }).sort({ blockStart: 1 });

    const summary = await MonitoringSession.findOne({
      employeeId: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    return NextResponse.json({ blocks, summary });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
