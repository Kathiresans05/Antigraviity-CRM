import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Attendance from "@/backend/models/Attendance";
import User from "@/backend/models/User";
import mongoose from "mongoose";
import moment from "moment";

async function getLeaveModel() {
    try { return (await import("@/backend/models/Leave")).default; } catch { return null; }
}
async function getTaskModel() {
    try { return (await import("@/backend/models/Task")).default; } catch { return null; }
}
async function getProjectModel() {
    try { return (await import("@/backend/models/Project")).default; } catch { return null; }
}
async function getDailyChecklistModel() {
    try { return (await import("@/backend/models/DailyChecklist")).default; } catch { return null; }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const role = (session.user as any)?.role;
        const allowedRoles = ["Admin", "HR", "HR Manager", "Manager", "Assigned Manager", "TL"];
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id: employeeId } = await params;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        await connectToDatabase();

        const now = new Date();

        // ─── FETCH EMPLOYEE JOIN DATE ────────────────────────────────────
        const employee = await User.findById(employeeId).select("joinDate name").lean() as any;
        const joinDate = employee?.joinDate ? new Date(employee.joinDate) : new Date(0);
        // Use the later of: start of this month OR join date (for attendance)
        const thisMonthStart = moment().startOf("month").toDate();
        const attendanceFrom = joinDate > thisMonthStart ? joinDate : thisMonthStart;

        const thisMonth = {
            start: attendanceFrom,
            end: moment().endOf("month").toDate(),
        };
        const thisYear = {
            // leave from join date (or start of year, whichever is later)
            start: joinDate > moment().startOf("year").toDate() ? joinDate : moment().startOf("year").toDate(),
            end: moment().endOf("year").toDate(),
        };
        const last30Days = joinDate > moment().subtract(30, "days").startOf("day").toDate()
            ? joinDate
            : moment().subtract(30, "days").startOf("day").toDate();

        // ─── ATTENDANCE SUMMARY (This Month) ──────────────────────────
        const attendanceRecords = await Attendance.find({
            userId: employeeId,
            date: { $gte: thisMonth.start, $lte: thisMonth.end },
        }).sort({ date: -1 }).lean();

        const presentCount = attendanceRecords.filter((r: any) => r.status === "Present").length;
        const lateCount = attendanceRecords.filter((r: any) => r.status === "Late").length;
        const absentCount = attendanceRecords.filter((r: any) => r.status === "Absent").length;
        const halfDayCount = attendanceRecords.filter((r: any) => r.status === "Half Day").length;
        const earlyLogoutCount = attendanceRecords.filter((r: any) => r.status === "Early Logout").length;
        const onLeaveCount = attendanceRecords.filter((r: any) => r.status === "On Leave").length;

        // Count Mon-Fri working days from attendanceFrom up to today (inclusive)
        let workingDaysSinceJoin = 0;
        const cursor = moment(attendanceFrom).startOf("day");
        const todayEnd = moment(now).startOf("day");
        while (cursor.isSameOrBefore(todayEnd)) {
            const dow = cursor.day(); // 0=Sun, 6=Sat
            if (dow !== 0 && dow !== 6) workingDaysSinceJoin++;
            cursor.add(1, "day");
        }
        // Attendance rate: (present + late + earlyLogout + halfDay*0.5) / workingDays * 100
        const attendedDays = presentCount + lateCount + earlyLogoutCount + halfDayCount * 0.5;
        const attendanceRate = workingDaysSinceJoin > 0
            ? Math.round((attendedDays / workingDaysSinceJoin) * 100)
            : 0;

        const attendanceStats = {
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            halfDay: halfDayCount,
            earlyLogout: earlyLogoutCount,
            onLeave: onLeaveCount,
            total: attendanceRecords.length,
            workingDays: workingDaysSinceJoin,
            attendanceRate,
            avgHours: attendanceRecords.length
                ? +(attendanceRecords.reduce((s: number, r: any) => s + (r.totalHours || 0), 0) / attendanceRecords.length).toFixed(1)
                : 0,
        };

        // ─── DAILY LOGIN/LOGOUT LOG (Last 30 days) ─────────────────────
        const dailyLog = await Attendance.find({
            userId: employeeId,
            date: { $gte: last30Days },
        }).sort({ date: -1 }).limit(30).lean();

        const attendanceLog = dailyLog.map((r: any) => ({
            date: moment(r.date).format("ddd, MMM DD"),
            status: r.status,
            clockIn: r.clockInTime ? moment(r.clockInTime).format("hh:mm A") : "—",
            clockOut: r.clockOutTime ? moment(r.clockOutTime).format("hh:mm A") : "—",
            totalHours: r.totalHours ? `${r.totalHours.toFixed(1)}h` : "—",
            autoClosed: r.autoClosed || false,
        }));

        // ─── LEAVE (This Year) ─────────────────────────────────────────
        let leaveStats = { approved: 0, pending: 0, rejected: 0, totalDays: 0, history: [] as any[] };
        const Leave = await getLeaveModel();
        if (Leave) {
            const leaves = await Leave.find({ userId: employeeId, startDate: { $gte: thisYear.start } }).lean();
            leaveStats = {
                approved: leaves.filter((l: any) => l.status === "Approved").length,
                pending: leaves.filter((l: any) => l.status === "Pending").length,
                rejected: leaves.filter((l: any) => l.status === "Rejected").length,
                totalDays: leaves.filter((l: any) => l.status === "Approved").reduce((s: number, l: any) => s + (l.totalDays || 0), 0),
                history: leaves.slice(0, 8).map((l: any) => ({
                    type: l.type,
                    startDate: moment(l.startDate).format("MMM DD"),
                    endDate: moment(l.endDate).format("MMM DD, YYYY"),
                    totalDays: l.totalDays,
                    status: l.status,
                    reason: l.reason,
                })),
            };
        }

        // ─── TASK LIST (All, with detail — from join date only) ────────
        let taskStats = { completed: 0, inProgress: 0, pending: 0, overdue: 0, completionRate: 0 };
        let taskList: any[] = [];
        const Task = await getTaskModel();
        if (Task) {
            const tasks = await Task.find({
                assignedTo: employeeId,
                createdAt: { $gte: joinDate },   // ← only tasks since join date
            }).sort({ createdAt: -1 }).lean();
            taskStats = {
                completed: tasks.filter((t: any) => t.status === "Completed").length,
                inProgress: tasks.filter((t: any) => t.status === "In Progress").length,
                pending: tasks.filter((t: any) => t.status === "Pending" || t.status === "To Do").length,
                overdue: tasks.filter((t: any) => t.due && new Date(t.due) < now && t.status !== "Completed").length,
                completionRate: tasks.length
                    ? Math.round((tasks.filter((t: any) => t.status === "Completed").length / tasks.length) * 100)
                    : 0,
            };
            taskList = tasks.map((t: any) => ({
                id: t._id,
                title: t.title,
                project: t.project || "—",
                status: t.status,
                priority: t.priority || "Medium",
                due: t.due ? moment(t.due).format("MMM DD, YYYY") : "—",
                isOverdue: !!(t.due && new Date(t.due) < now && t.status !== "Completed"),
            }));
        }

        // ─── PROJECTS ──────────────────────────────────────────────────
        let projects: any[] = [];
        const Project = await getProjectModel();
        if (Project) {
            const empProjects = await Project.find({
                $or: [
                    { assignedMembers: employeeId },
                    { teamMembers: employeeId },
                    { members: employeeId },
                ]
            }).select("name status progress startDate endDate client").limit(10).lean();
            projects = empProjects.map((p: any) => ({
                id: p._id,
                name: p.name,
                client: p.client || "—",
                status: p.status || "Active",
                progress: p.progress || 0,
                startDate: p.startDate ? moment(p.startDate).format("MMM DD, YYYY") : "—",
                endDate: p.endDate ? moment(p.endDate).format("MMM DD, YYYY") : "—",
            }));
        }

        // ─── DAILY CHECKLIST ACTIVITY (Last 7 days) ───────────────────
        let dailyActivity: any[] = [];
        const DailyChecklist = await getDailyChecklistModel();
        if (DailyChecklist) {
            const last7 = moment().subtract(7, "days").startOf("day").toDate();
            const checklists = await DailyChecklist.find({
                userId: employeeId,
                date: { $gte: last7 },
            }).sort({ date: -1 }).lean();

            dailyActivity = checklists.map((c: any) => ({
                date: moment(c.date).format("ddd, MMM DD"),
                total: c.items?.length || 0,
                completed: c.items?.filter((i: any) => i.completed).length || 0,
                items: c.items?.map((i: any) => ({ title: i.title, completed: i.completed })) || [],
            }));
        }

        return NextResponse.json({
            attendance: attendanceStats,
            attendanceLog,
            leave: leaveStats,
            tasks: taskStats,
            taskList,
            projects,
            dailyActivity,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
    }
}
