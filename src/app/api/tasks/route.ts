import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/Task";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as any)?.role;
        const userId = (session.user as any)?.id;

        await connectToDatabase();

        const isAdminHR = ["Admin", "HR Manager", "HR"].includes(role);

        let query: any = {};
        if (isAdminHR) {
            query = {};
        } else if (["Manager", "Assigned Manager", "TL"].includes(role)) {
            // Managers and TLs see tasks assigned to them OR their subordinates OR created by them
            const { getManagedUserIds } = require("@/lib/hierarchy");
            const managedIds = await getManagedUserIds(userId, role, true);
            
            query = {
                $or: [
                    { assignedTo: userId },
                    { createdBy: userId },
                    { assignedTo: { $in: managedIds } }
                ]
            };
        } else {
            // Employees see only their assigned tasks
            query = { assignedTo: userId };
        }

        const tasks = await Task.find(query).sort({ createdAt: -1 });

        return NextResponse.json(tasks);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isAdminRole = ["Admin", "Manager", "HR Manager", "HR", "Assigned Manager", "TL"].includes(user?.role);

        if (!session || !isAdminRole) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        await connectToDatabase();

        const newTask = await Task.create({
            ...data,
            createdBy: session.user.id
        });
        return NextResponse.json(newTask, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}
