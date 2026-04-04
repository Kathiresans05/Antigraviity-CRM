import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import ActivityBlock from "@/backend/models/ActivityBlock";
import MonitoringSession from "@/backend/models/MonitoringSession";
import MonitoringAuditLog from "@/backend/models/MonitoringAuditLog";
import User from "@/backend/models/User";
import dbConnect from "@/backend/lib/mongodb";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || (session.user as any).id;
    const isTeamQuery = searchParams.get("team") === "true";
    const isAllQuery = searchParams.get("all") === "true";
    const isAuditQuery = searchParams.get("audit") === "true";
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);

    await dbConnect();

    // 1. Audit Log Access (Admin Only)
    if (isAuditQuery) {
      if (userRole !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const auditLogs = await MonitoringAuditLog.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: -1 });
      return NextResponse.json({ auditLogs });
    }

    // 2. Global/Team Reporting Access (Admin, HR, Manager)
    if (isTeamQuery || isAllQuery) {
      const allowedRoles = ["Admin", "HR", "Manager", "Team Leader"];
      if (!allowedRoles.includes(userRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      // Build a more flexible query: 
      // For real-time tracker: show all currently ACTIVE sessions 
      // OR sessions created today.
      const sessionQuery = isTeamQuery 
        ? { $or: [{ sessionStatus: "Active" }, { createdAt: { $gte: startDate, $lte: endDate } }] }
        : { createdAt: { $gte: startDate, $lte: endDate } };

      const sessions = await MonitoringSession.find(sessionQuery)
        .populate({ path: "employeeId", model: User, select: "name role email" })
        .sort({ loginTime: -1 });

      // Grouping logic for Team overview
      const userReportsMap = new Map<string, any>();

      for (const s of sessions) {
        const userIdStr = (s.employeeId as any)?._id?.toString() || "Unknown";
        if (!userReportsMap.has(userIdStr)) {
          const userData = s.employeeId || { _id: userIdStr, name: "Employee", role: "N/A" };
          userReportsMap.set(userIdStr, {
            user: userData,
            session: {
              sessionStatus: s.sessionStatus,
              loginTime: s.loginTime,
              totalActiveSeconds: s.totalActiveSeconds,
              totalIdleSeconds: s.totalIdleSeconds,
              updatedAt: s.updatedAt,
            },
            activity: { keyboardTotal: 0, mouseTotal: 0 }
          });
        }

        const report = userReportsMap.get(userIdStr);
        // Special case: if one session is "Active", we keep that status
        if (s.sessionStatus === "Active") {
          report.session.sessionStatus = "Active";
          report.session.updatedAt = s.updatedAt;
        }

        const blocks = await ActivityBlock.find({ sessionId: s._id }).sort({ blockStart: 1 });
        report.activity.keyboardTotal += blocks.reduce((acc, b) => acc + b.keyboardCount, 0);
        report.activity.mouseTotal += blocks.reduce((acc, b) => acc + b.mouseCount, 0);
        report.session.totalActiveSeconds += s.totalActiveSeconds || 0;
        report.session.totalIdleSeconds += s.totalIdleSeconds || 0;
        
        // Take last 12 blocks for sparkline (last 12 mins)
        report.activity.recentBlocks = blocks.slice(-12).map(b => ({
          keyboard: b.keyboardCount,
          mouse: b.mouseCount,
          time: Number(b.blockStart)
        }));
      }

      const reports = Array.from(userReportsMap.values());
      return NextResponse.json(isTeamQuery ? { teamRecords: reports } : { reports });
    }

    // 3. Individual Activity Stats
    const blocks = await ActivityBlock.find({
      employeeId: userId,
      blockStart: { $gte: startDate, $lte: endDate }
    }).sort({ blockStart: 1 });

    // Find audit logs for break transitions
    const auditLogs = await MonitoringAuditLog.find({
      actorId: userId,
      createdAt: { $gte: startDate, $lte: endDate },
      actionType: { $in: ["Break Started", "Break Ended"] }
    }).sort({ createdAt: 1 });

    return NextResponse.json({ blocks, summary, auditLogs });
  } catch (err) {
    console.error("Stats API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
