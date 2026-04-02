import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Meeting from "@/backend/models/Meeting";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();
        await Meeting.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
    }
}
