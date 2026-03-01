import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Holiday from "@/models/Holiday";
import moment from "moment";

export async function GET() {
    try {
        await connectToDatabase();
        const holidays = await Holiday.find().sort({ date: 1 });
        return NextResponse.json(holidays);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["Admin", "HR", "HR Manager"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, date, type } = await req.json();

        if (!name || !date) {
            return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
        }

        await connectToDatabase();

        const holiday = await Holiday.create({
            name,
            date: moment(date).startOf('day').toDate(),
            type
        });

        return NextResponse.json(holiday, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A holiday already exists on this date" }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
