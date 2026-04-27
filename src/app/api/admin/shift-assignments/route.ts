import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import ShiftAssignment from "@/backend/models/ShiftAssignment";
import User from "@/backend/models/User";
import Shift from "@/backend/models/Shift";
import AttendancePolicy from "@/backend/models/AttendancePolicy";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['Admin', 'HR'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        
        let query = {};
        if (userId) query = { userId };

        const assignments = await ShiftAssignment.find(query)
            .populate('userId', 'name employeeCode')
            .populate('shiftId', 'name startTime endTime')
            .populate('policyId', 'name')
            .sort({ effectiveFrom: -1 });
            
        return NextResponse.json({ assignments });
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
        const { userId, userIds, shiftId, policyId, effectiveFrom, notes } = await req.json();

        // Normalize to array of IDs
        const targetUserIds = userIds || (userId ? [userId] : []);

        if (targetUserIds.length === 0) {
            return NextResponse.json({ error: "No users selected" }, { status: 400 });
        }

        for (const id of targetUserIds) {
            console.log(`Assigning shift/policy to user: ${id}`);
            // Close any existing active assignment for this user
            try {
                await ShiftAssignment.updateMany(
                    { userId: id, effectiveTo: null },
                    { $set: { effectiveTo: effectiveFrom || new Date() } }
                );

                await ShiftAssignment.create({
                    userId: id,
                    shiftId,
                    policyId,
                    effectiveFrom: effectiveFrom || new Date(),
                    assignedBy: session.user.id,
                    notes
                });

                // Also update the User model for quick reference
                await User.findByIdAndUpdate(id, { 
                    shift: shiftId,
                    attendancePolicy: policyId 
                });
            } catch (innerError: any) {
                console.error(`Error for user ${id}:`, innerError.message);
                throw innerError;
            }
        }

        return NextResponse.json({ 
            message: `Successfully assigned to ${targetUserIds.length} employees`, 
            count: targetUserIds.length 
        });
    } catch (error: any) {
        console.error("SHIFT ASSIGNMENT ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
