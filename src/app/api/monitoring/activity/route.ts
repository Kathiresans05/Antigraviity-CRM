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

    const data = await req.json();
    const { sessionId, blocks, keyboardCount, mouseCount, idleSeconds, activeSeconds } = data;
    await dbConnect();

    let totalActive = 0;
    let totalIdle = 0;

    if (blocks && Array.isArray(blocks)) {
      // Batch insert activity blocks (legacy/full sync)
      const docBlocks = blocks.map((b: any) => ({
        ...b,
        employeeId: (session.user as any).id,
        sessionId
      }));
      await ActivityBlock.insertMany(docBlocks);
      totalActive = docBlocks.reduce((acc: number, b: any) => acc + b.activeSeconds, 0);
      totalIdle = docBlocks.reduce((acc: number, b: any) => acc + b.idleSeconds, 0);
    } else if (sessionId) {
      // Single heartbeat block (new standard)
      await ActivityBlock.create({
        employeeId: (session.user as any).id,
        sessionId,
        keyboardCount: keyboardCount || 0,
        mouseCount: mouseCount || 0,
        idleSeconds: idleSeconds || 0,
        activeSeconds: activeSeconds || 0
      });
      totalActive = activeSeconds || 0;
      totalIdle = idleSeconds || 0;
    }

    await MonitoringSession.findByIdAndUpdate(sessionId, {
      $inc: { totalActiveSeconds: totalActive, totalIdleSeconds: totalIdle }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
