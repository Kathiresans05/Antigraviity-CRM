import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import MonitoringSession from "@/backend/models/MonitoringSession";
import MonitoringAuditLog from "@/backend/models/MonitoringAuditLog";
import dbConnect from "@/backend/lib/mongodb";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    await dbConnect();

    if (action === "start") {
      const newSession = await MonitoringSession.create({
        employeeId: (session.user as any).id,
        loginTime: new Date(),
        sessionStatus: "Active"
      });
      return NextResponse.json({ success: true, sessionId: newSession._id });
    } else if (action === "end") {
      const activeSession = await MonitoringSession.findOneAndUpdate(
        { employeeId: (session.user as any).id, sessionStatus: { $in: ["Active", "On Break"] } },
        { logoutTime: new Date(), sessionStatus: "Completed" },
        { new: true }
      );
      return NextResponse.json({ success: true, session: activeSession });
    } else if (action === "toggle-break") {
      const currentSession = await MonitoringSession.findOne({ 
        employeeId: (session.user as any).id, 
        sessionStatus: { $in: ["Active", "On Break"] } 
      });
      if (!currentSession) return NextResponse.json({ error: "No active session found" }, { status: 400 });

      const nextStatus = currentSession.sessionStatus === "Active" ? "On Break" : "Active";
      currentSession.sessionStatus = nextStatus;
      await currentSession.save();

      // Log the break event
      await MonitoringAuditLog.create({
        actorId: (session.user as any).id,
        actorRole: (session.user as any).role,
        actionType: nextStatus === "On Break" ? "Break Started" : "Break Ended",
        metadata: { sessionId: currentSession._id }
      });

      return NextResponse.json({ success: true, status: nextStatus });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Session API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const activeSession = await MonitoringSession.findOne({ employeeId: (session.user as any).id, sessionStatus: "Active" });
    return NextResponse.json({ activeSession });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
