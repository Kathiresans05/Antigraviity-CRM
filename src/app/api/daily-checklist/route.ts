import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import DailyChecklist from "@/models/DailyChecklist";
import User from "@/models/User";
import moment from "moment";
import { getManagedUserIds } from "@/lib/hierarchy";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const todayStart = moment().startOf('day').toDate();
        const todayEnd = moment().endOf('day').toDate();

        const userId = session.user.id;
        const userRole = (session.user as any).role;
        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get('userId');

        const managedIds = await getManagedUserIds(userId, userRole);

        // If a specific user is requested, verify if the session user can see them
        if (targetUserId) {
            const canManage = managedIds && managedIds.includes(targetUserId);
            if (!canManage && targetUserId !== userId) {
                return NextResponse.json({ error: "Forbidden: You don't manage this user." }, { status: 403 });
            }

            let record = await DailyChecklist.findOne({
                userId: targetUserId,
                date: { $gte: todayStart, $lte: todayEnd }
            });

            if (!record) {
                // Initialize for target user if not exists
                record = await DailyChecklist.create({
                    userId: targetUserId,
                    date: moment().startOf('day').toDate(),
                    items: [
                        { id: 'login', title: 'Office login time marked', completed: false },
                        { id: 'email', title: 'Email checked', completed: false },
                        { id: 'tasks_reviewed', title: 'Today tasks reviewed', completed: false },
                        { id: 'pending_noted', title: 'Pending work noted', completed: false },
                        { id: 'tasks_marked', title: 'Today completed tasks marked', completed: false },
                        { id: 'tasks_moved', title: 'Pending tasks moved to tomorrow', completed: false },
                        { id: 'attendance_logout', title: 'Attendance logout completed', completed: false },
                        { id: 'report_submitted', title: 'Daily report submitted', completed: false }
                    ]
                });
            }
            return NextResponse.json({ record });
        }

        // If the user has a team (is Manage/Admin/TL with members)
        if (managedIds) {
            // Check if user is actually a management role that should see a list
            // TLs should see their team list, Managers too.
            const isManagement = ['Admin', 'HR', 'HR Manager', 'Manager', 'Assigned Manager', 'TL'].includes(userRole);

            if (isManagement) {
                const records = await DailyChecklist.find({
                    userId: { $in: managedIds },
                    date: { $gte: todayStart, $lte: todayEnd }
                }).populate('userId', 'name email');

                // Always return the list for management roles
                return NextResponse.json({ records });
            }
        }

        // Employee finds or creates their own for today
        let record = await DailyChecklist.findOne({
            userId: session.user.id,
            date: { $gte: todayStart, $lte: todayEnd }
        });

        // Initialize today's checklist if it doesn't exist
        if (!record) {
            record = await DailyChecklist.create({
                userId: session.user.id,
                date: moment().startOf('day').toDate(),
                items: [
                    { id: 'login', title: 'Office login time marked', completed: false },
                    { id: 'email', title: 'Email checked', completed: false },
                    { id: 'tasks_reviewed', title: 'Today tasks reviewed', completed: false },
                    { id: 'pending_noted', title: 'Pending work noted', completed: false },
                    { id: 'tasks_marked', title: 'Today completed tasks marked', completed: false },
                    { id: 'tasks_moved', title: 'Pending tasks moved to tomorrow', completed: false },
                    { id: 'attendance_logout', title: 'Attendance logout completed', completed: false },
                    { id: 'report_submitted', title: 'Daily report submitted', completed: false }
                ]
            });
        }

        return NextResponse.json({ record });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { items, targetUserId } = await req.json();

        const userId = session.user.id;
        const userRole = (session.user as any).role;
        const updateUserId = targetUserId || userId;

        if (targetUserId && targetUserId !== userId) {
            const managedIds = await getManagedUserIds(userId, userRole);
            if (!managedIds || !managedIds.includes(targetUserId)) {
                return NextResponse.json({ error: "Forbidden: You don't manage this user." }, { status: 403 });
            }
        }

        const todayStart = moment().startOf('day').toDate();
        const todayEnd = moment().endOf('day').toDate();

        const record = await DailyChecklist.findOneAndUpdate(
            {
                userId: updateUserId,
                date: moment().startOf('day').toDate()
            },
            { items },
            { new: true, upsert: true }
        );

        return NextResponse.json({ message: "Checklist updated", record });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
