import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import MonitoringSession from "@/backend/models/MonitoringSession";
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
        { employeeId: (session.user as any).id, sessionStatus: "Active" },
        { logoutTime: new Date(), sessionStatus: "Completed" },
        { new: true }
      );
      return NextResponse.json({ success: true, session: activeSession });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
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
