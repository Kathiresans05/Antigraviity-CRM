import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import DailyTask from "@/backend/models/DailyTask";
import moment from "moment";
import { getManagedUserIds } from "@/backend/lib/hierarchy";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only Admin/TL can assign daily tasks
        const userRole = (session.user as any).role;
        if (!['Admin', 'Manager', 'HR Manager', 'TL'].includes(userRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectToDatabase();
        const { title, assignedTo } = await req.json();

        if (!title || !assignedTo) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const todayDate = moment().startOf('day').toDate();

        const newTask = await DailyTask.create({
            title,
            assignedTo,
            assignedBy: session.user.id,
            date: todayDate,
            completed: false
        });

        return NextResponse.json({ message: "Task assigned successfully", record: newTask }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // Return only today's tasks
        const todayStart = moment().startOf('day').toDate();
        const todayEnd = moment().endOf('day').toDate();

        let query: any = {
            date: { $gte: todayStart, $lte: todayEnd }
        };

        const userId = session.user.id;
        const userRole = (session.user as any).role;
        const managedIds = await getManagedUserIds(userId, userRole);

        if (managedIds) {
            query.assignedTo = { $in: managedIds };
        }

        const records = await DailyTask.find(query).populate('assignedTo', 'name email');

        return NextResponse.json({ records });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { taskId, completed } = await req.json();

        if (!taskId || typeof completed !== 'boolean') {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const task = await DailyTask.findById(taskId);

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Only the assigned employee (or Admin) can mark it done
        if (task.assignedTo.toString() !== session.user.id && (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        task.completed = completed;
        await task.save();

        return NextResponse.json({ message: "Task updated", record: task });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
