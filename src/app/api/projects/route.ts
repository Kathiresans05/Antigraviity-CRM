import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Project from "@/backend/models/Project";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectToDatabase();
        const projects = await Project.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ projects });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        if (!["Admin", "Manager", "TL", "HR Manager"].includes(role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        await connectToDatabase();

        const project = await Project.create(data);
        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const role = (session.user as any)?.role;
        if (!["Admin", "Manager", "Assigned Manager", "TL", "HR Manager"].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id, progress, status } = await req.json();
        await connectToDatabase();

        const updated = await Project.findByIdAndUpdate(
            id,
            { progress, status },
            { new: true }
        );

        if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        return NextResponse.json({ project: updated });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }
}
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const role = (session.user as any)?.role;
        if (!["Admin", "Manager", "Assigned Manager", "TL", "HR Manager"].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Project ID is required" }, { status: 400 });

        await connectToDatabase();
        const deleted = await Project.findByIdAndDelete(id);

        if (!deleted) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        return NextResponse.json({ message: "Project deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}
