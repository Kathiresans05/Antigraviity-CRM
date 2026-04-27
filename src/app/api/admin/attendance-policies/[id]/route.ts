import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import AttendancePolicy from "@/backend/models/AttendancePolicy";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['Admin', 'HR'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const policy = await AttendancePolicy.findById(params.id);
        if (!policy) return NextResponse.json({ error: "Policy not found" }, { status: 404 });
        
        return NextResponse.json({ policy });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['Admin', 'HR'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();
        
        const policy = await AttendancePolicy.findByIdAndUpdate(params.id, body, { new: true });
        if (!policy) return NextResponse.json({ error: "Policy not found" }, { status: 404 });
        
        return NextResponse.json({ message: "Policy updated successfully", policy });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['Admin', 'HR'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const policy = await AttendancePolicy.findByIdAndDelete(params.id);
        if (!policy) return NextResponse.json({ error: "Policy not found" }, { status: 404 });
        
        return NextResponse.json({ message: "Policy deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
