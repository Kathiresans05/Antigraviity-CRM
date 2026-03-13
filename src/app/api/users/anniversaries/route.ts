import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import moment from "moment";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const filter = searchParams.get('filter') || 'today';
        const department = searchParams.get('department');

        const today = moment().startOf('day');
        const currentMonth = today.month() + 1; // 1-12
        const currentDay = today.date();

        let query: any = { status: 'active' };
        if (department && department !== 'all') {
            query.department = department;
        }

        const users = await User.find(query, 'name email role department joinDate employeeCode designation')
            .sort({ joinDate: 1 });

        const filteredUsers = users.filter((u: any) => {
            if (!u.joinDate) return false;
            
            const joinMoment = moment(u.joinDate);
            const joinMonth = joinMoment.month() + 1;
            const joinDay = joinMoment.date();
            const joinYear = joinMoment.year();
            
            // Cannot have anniversary in the same year they joined
            if (joinYear === today.year()) return false;

            if (filter === 'today') {
                return joinMonth === currentMonth && joinDay === currentDay;
            } else if (filter === 'week') {
                const weekStart = moment().startOf('week');
                const weekEnd = moment().endOf('week');
                
                // Construct anniversary this year
                const anniversaryThisYear = moment([today.year(), joinMoment.month(), joinMoment.date()]);
                return anniversaryThisYear.isBetween(weekStart, weekEnd, 'day', '[]');
            } else if (filter === 'month') {
                return joinMonth === currentMonth;
            }
            return true;
        }).map((u: any) => {
            const joinMoment = moment(u.joinDate);
            const yearsCompleted = today.year() - joinMoment.year();
            
            return {
                ...u.toObject(),
                yearsCompleted,
                anniversaryDate: joinMoment.format('MMM DD')
            };
        });

        return NextResponse.json({ users: filteredUsers });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
