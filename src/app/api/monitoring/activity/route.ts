import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import ActivityBlock from "@/backend/models/ActivityBlock";
import MonitoringSession from "@/backend/models/MonitoringSession";
import dbConnect from "@/backend/lib/mongodb";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { blocks, sessionId } = await req.json();
    await dbConnect();

    // Batch insert activity blocks
    const docBlocks = blocks.map((b: any) => ({
      ...b,
      employeeId: (session.user as any).id,
      sessionId
    }));

    await ActivityBlock.insertMany(docBlocks);

    // Update total seconds in session
    const totalActive = docBlocks.reduce((acc: number, b: any) => acc + b.activeSeconds, 0);
    const totalIdle = docBlocks.reduce((acc: number, b: any) => acc + b.idleSeconds, 0);

    await MonitoringSession.findByIdAndUpdate(sessionId, {
      $inc: { totalActiveSeconds: totalActive, totalIdleSeconds: totalIdle }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
