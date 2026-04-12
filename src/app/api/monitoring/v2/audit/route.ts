import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import MonitoringAuditLog from "@/backend/models/MonitoringAuditLog";
import dbConnect from "@/backend/lib/mongodb";

// POST: Start a monitoring session (Audit)
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "Admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 0 });
        }

        const body = await req.body.json();
        const { employeeId, employeeName, viewPurpose } = body;

        await dbConnect();

        const log = new MonitoringAuditLog({
            adminId: (session.user as any).id,
            adminName: session.user?.name || "Administrator",
            employeeId,
            employeeName,
            action: "view_start",
            viewPurpose,
            startTime: new Date()
        });

        await log.save();
        return NextResponse.json({ success: true, logId: log._id }, { status: 201 });
    } catch (err: any) {
        console.error("[Audit API ERROR]:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// PATCH: Stop a monitoring session (Audit)
// Usage: /api/monitoring/v2/audit?logId=...
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "Admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const logId = searchParams.get("logId");

        if (!logId) {
            return NextResponse.json({ error: "Missing logId" }, { status: 400 });
        }

        await dbConnect();

        const endTime = new Date();
        const log = await MonitoringAuditLog.findById(logId);
        
        if (!log) {
            return NextResponse.json({ error: "Log not found" }, { status: 404 });
        }

        log.endTime = endTime;
        log.action = "view_stop";
        if (log.startTime) {
            log.durationSeconds = Math.round((endTime.getTime() - log.startTime.getTime()) / 1000);
        }
        
        await log.save();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[Audit API ERROR]:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
