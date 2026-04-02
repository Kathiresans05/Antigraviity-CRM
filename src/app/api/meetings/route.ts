import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Meeting from "@/backend/models/Meeting";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const meetings = await Meeting.find({})
            .populate('participants', 'name')
            .sort({ date: 1 });

        return NextResponse.json(meetings);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        await connectToDatabase();

        const newMeeting = await Meeting.create({
            ...data,
            createdBy: (session.user as any)?.id,
        });

        return NextResponse.json(newMeeting, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
    }
}
