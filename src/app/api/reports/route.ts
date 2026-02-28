import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import Attendance from "@/models/Attendance";
import mongoose from 'mongoose';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = (session.user as any).role === 'Admin';
        const userId = (session.user as any).id;

        await connectToDatabase();

        // Base query for tasks depending on role
        const taskQuery = isAdmin ? {} : { assignedTo: userId };

        const [totalEmployees, allTasks] = await Promise.all([
            User.countDocuments({ isActive: true, role: { $ne: 'Admin' } }),
            Task.find(taskQuery)
        ]);

        // KPI Calculations
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.status === 'Done').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Task Status Distribution (Pie Chart)
        const pendingCount = allTasks.filter(t => t.status === 'To Do').length;
        const inProgressCount = allTasks.filter(t => t.status === 'In Progress' || t.status === 'Review').length;

        // Employee Work Report (Bar Chart)
        const barChartLabels = [];
        const barChartData = [];

        if (isAdmin) {
            // Group completed tasks by assigned user
            const tasksByUser = allTasks.filter(t => t.status === 'Done').reduce((acc, task) => {
                const uid = task.assignedTo?.toString();
                if (uid) {
                    acc[uid] = (acc[uid] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            // Get Top 5 employees by completed tasks
            const topUserIds = Object.keys(tasksByUser).sort((a, b) => tasksByUser[b] - tasksByUser[a]).slice(0, 5);

            // Filter valid ObjectIds to prevent Mongoose CastError on legacy tasks
            const validUserIds = topUserIds.filter(uid => mongoose.Types.ObjectId.isValid(uid));

            // Fetch names for those users
            const topUsers = await User.find({ _id: { $in: validUserIds } }, 'name');

            for (const uid of topUserIds) {
                if (mongoose.Types.ObjectId.isValid(uid)) {
                    const user = topUsers.find(u => u._id.toString() === uid);
                    if (user) {
                        barChartLabels.push(user.name.split(' ')[0]); // Use first name
                    } else {
                        barChartLabels.push("Unknown");
                    }
                } else {
                    // Legacy tasks saved with string initials
                    barChartLabels.push(uid);
                }
                barChartData.push(tasksByUser[uid]);
            }
        } else {
            // If employee, group tasks by project instead of by user
            const tasksByProject = allTasks.filter(t => t.status === 'Done').reduce((acc, task) => {
                const project = task.project || "Unassigned";
                acc[project] = (acc[project] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            for (const project in tasksByProject) {
                barChartLabels.push(project);
                barChartData.push(tasksByProject[project]);
            }
        }

        // Fill with generic if empty
        if (barChartLabels.length === 0) {
            barChartLabels.push("No Data");
            barChartData.push(0);
        }

        // Attendance Analysis (Line Chart) - Last 7 days
        const today = new Date();
        const past7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - (6 - i));
            d.setHours(0, 0, 0, 0);
            return d;
        });

        // Query attendance for the last 7 days
        const startDate = past7Days[0];
        const endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        // Base query for attendance depending on role
        const attendanceQuery: any = {
            date: { $gte: startDate, $lte: endDate },
            status: 'Present'
        };

        if (!isAdmin) {
            attendanceQuery.userId = userId;
        }

        const attendanceRecords = await Attendance.find(attendanceQuery);

        const lineChartLabels = past7Days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }));
        const lineChartData = past7Days.map(day => {
            return attendanceRecords.filter(a => {
                const recordDate = new Date(a.date);
                return recordDate.getDate() === day.getDate() &&
                    recordDate.getMonth() === day.getMonth() &&
                    recordDate.getFullYear() === day.getFullYear();
            }).length;
        });

        return NextResponse.json({
            isAdmin,
            kpi: {
                performance: completionRate,
                totalEmployees,
                totalTasks,
                completedTasks
            },
            charts: {
                bar: {
                    labels: barChartLabels,
                    data: barChartData
                },
                pie: {
                    labels: ['Pending', 'In Progress', 'Completed'],
                    data: [pendingCount, inProgressCount, completedTasks]
                },
                line: {
                    labels: lineChartLabels,
                    data: lineChartData
                }
            }
        });

    } catch (error: any) {
        console.error("Reports API Error:", error);
        return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
    }
}
