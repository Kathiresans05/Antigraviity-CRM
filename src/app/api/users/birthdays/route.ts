import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import User from "@/backend/models/User";
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
        const currentMonth = today.month() + 1;
        const currentDay = today.date();

        let query: any = { status: 'active' };
        if (department && department !== 'all') {
            query.department = department;
        }

        const users = await User.find(query, 'name email role department dob employeeCode designation')
            .sort({ dob: 1 });

        const filteredUsers = users.filter((u: any) => {
            if (!u.dob) return false;
            
            const dobMoment = moment(u.dob);
            const birthMonth = dobMoment.month() + 1;
            const birthDay = dobMoment.date();

            if (filter === 'today') {
                return birthMonth === currentMonth && birthDay === currentDay;
            } else if (filter === 'week') {
                const weekStart = moment().startOf('week');
                const weekEnd = moment().endOf('week');
                
                // Birthday this year
                const birthdayThisYear = moment([today.year(), dobMoment.month(), dobMoment.date()]);
                return birthdayThisYear.isBetween(weekStart, weekEnd, 'day', '[]');
            } else if (filter === 'month') {
                return birthMonth === currentMonth;
            }
            return true;
        }).map((u: any) => {
            const dobMoment = moment(u.dob);
            const age = today.year() - dobMoment.year();
            
            return {
                ...u.toObject(),
                age,
                birthdayDate: dobMoment.format('MMM DD')
            };
        });

        return NextResponse.json({ users: filteredUsers });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
