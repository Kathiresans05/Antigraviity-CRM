import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Shift from "@/backend/models/Shift";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "Admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();
        const data = await req.json();

        const shift = await Shift.findByIdAndUpdate(id, data, { new: true });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

        return NextResponse.json({ message: "Shift updated successfully", shift });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "Admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();
        
        const shift = await Shift.findByIdAndDelete(id);
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

        return NextResponse.json({ message: "Shift deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
