import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/backend/lib/mongodb";
import Room from "@/backend/models/Room";
import { getServerSession } from "next-auth";
import { authOptions } from "@/backend/lib/auth-config";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        
        // Fetch rooms that are either public (no allowedRoles) or user's role is allowed
        const userRole = (session.user as any).role;
        const rooms = await Room.find({
            $or: [
                { allowedRoles: { $size: 0 } },
                { allowedRoles: userRole }
            ]
        }).sort({ name: 1 });

        return NextResponse.json(rooms);
    } catch (error: any) {
        console.error("[Rooms API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
