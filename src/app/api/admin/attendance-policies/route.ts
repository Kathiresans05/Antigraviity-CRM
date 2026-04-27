import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import AttendancePolicy from "@/backend/models/AttendancePolicy";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['Admin', 'HR'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const policies = await AttendancePolicy.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ policies });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['Admin', 'HR'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();
        
        const policy = await AttendancePolicy.create(body);
        return NextResponse.json({ message: "Policy created successfully", policy });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
