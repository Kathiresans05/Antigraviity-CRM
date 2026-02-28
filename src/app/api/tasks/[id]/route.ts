import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/Task";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = await props.params;
        const data = await req.json();
        const user = session.user as any;
        const isElevatedRole = ["Admin", "Manager", "HR Manager", "HR", "Assigned Manager", "TL"].includes(user?.role);

        await connectToDatabase();

        const task = await Task.findById(params.id);
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Permission check
        const isAssigned = task.assignedTo === user.id;
        if (!isElevatedRole && !isAssigned) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Define which fields can be updated based on role
        let updateData: any = { status: data.status };
        
        // Admins, Managers, and TLs can reassign tasks
        if (["Admin", "Manager", "TL", "HR Manager"].includes(user?.role)) {
            if (data.assignedTo) updateData.assignedTo = data.assignedTo;
            if (data.priority) updateData.priority = data.priority;
            if (data.title) updateData.title = data.title;
            if (data.project) updateData.project = data.project;
            if (data.due) updateData.due = data.due;
        }

        const updatedTask = await Task.findByIdAndUpdate(params.id, updateData, { new: true });
        return NextResponse.json(updatedTask);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isAdminRole = ["Admin", "Manager", "HR Manager", "HR", "Assigned Manager"].includes(user?.role);

        if (!session || !isAdminRole) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = await props.params;
        await connectToDatabase();
        const deletedTask = await Task.findByIdAndDelete(params.id);

        if (!deletedTask) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Task deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
