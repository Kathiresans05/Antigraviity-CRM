import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Shift from "@/backend/models/Shift";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['Admin', 'HR', 'HR Manager'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const shifts = await Shift.find({}).sort({ name: 1 });
        return NextResponse.json({ shifts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "Admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { name, startTime, endTime, shiftType, halfDayCutoffTime, description } = await req.json();

        if (!name || !startTime || !endTime) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const shift = await Shift.create({
            name,
            startTime,
            endTime,
            shiftType: shiftType || 'General',
            halfDayCutoffTime: halfDayCutoffTime || '11:30',
            description
        });

        return NextResponse.json({ message: "Shift created successfully", shift }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
