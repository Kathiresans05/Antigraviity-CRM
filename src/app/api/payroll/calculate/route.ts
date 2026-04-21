import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import User from "@/backend/models/User";
import Attendance from "@/backend/models/Attendance";
import dbConnect from "@/backend/lib/mongodb";
import moment from "moment";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const monthQuery = searchParams.get("month"); // Format: "YYYY-MM"
        const fallbackSalary = parseFloat(searchParams.get("baseSalary") || "0");
        
        if (!userId || !monthQuery) {
            return NextResponse.json({ error: "userId and month (YYYY-MM) are required" }, { status: 400 });
        }

        await dbConnect();

        // 1. Fetch User and establish Base Salary
        const user = await User.findById(userId);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Use the primary salary field, fallback to salaryDetails.basePay, then finally the query parameter
        const monthlySalary = user.salary || user.salaryDetails?.basePay || fallbackSalary || 0;

        if (monthlySalary === 0) {
            return NextResponse.json({ error: "Monthly Salary is not defined in the Employee Profile (0). Please set a salary before calculating." }, { status: 400 });
        }

        // 2. Establish Date Range based on month
        const [yearStr, monthStr] = monthQuery.split('-');
        const year = parseInt(yearStr);
        const monthIndex = parseInt(monthStr) - 1; // 0-indexed for JS Date
        
        const startOfMonth = moment().year(year).month(monthIndex).startOf("month").toDate();
        const endOfMonth = moment().year(year).month(monthIndex).endOf("month").toDate();
        
        const totalDaysInMonth = moment(endOfMonth).date(); // Gets the last day of the month (28, 29, 30, 31)

        // 3. Per Day Salary Calculation
        const perDaySalary = monthlySalary / totalDaysInMonth;

        // 4. Fetch Attendance Records for the given month
        const attendanceRecords = await Attendance.find({
            userId: user._id,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // 5. Tally the explicitly tracked "Absent" and "Half Day" logic, IGNORING Sundays
        let absentDaysCount = 0;
        let halfDaysCount = 0;
        let presentDaysCount = 0;

        for (const record of attendanceRecords) {
            const dateObj = moment(record.date);
            const isSunday = dateObj.day() === 0;

            if (isSunday) {
                // Ignore Sundays entirely for deductions
                continue;
            }

            const status = record.status.toUpperCase();
            
            if (status.includes("ABSENT")) {
                absentDaysCount += 1;
            } else if (status.includes("HALF DAY") || status.includes("HALF_DAY")) {
                halfDaysCount += 1;
                presentDaysCount += 0.5; // Half present
            } else if (status.includes("PRESENT") || status.includes("ACTIVE") || status.includes("EARLY") || status.includes("LATE") || status.includes("FULL DAY") || status.includes("FULL_DAY")) {
                // If they have any kind of present/active status
                presentDaysCount += 1;
            } else if (status.includes("ON LEAVE") || status.includes("HOLIDAY")) {
                // Paid leaves / holidays have no deduction, so treated essentially as present conceptually 
                // but we might not want to count them in 'presentDaysCount' strictly for display
                // So we'll track them separately if needed, but for deduction purposes: NO DEDUCTION.
            }
        }

        // 6. Calculate Deductions
        // Formula: (AbsentDays × PerDaySalary) + (HalfDays × 0.5 × PerDaySalary)
        const totalDeduction = (absentDaysCount * perDaySalary) + (halfDaysCount * 0.5 * perDaySalary);

        // 7. Final Salary Calculation
        const finalSalary = monthlySalary - totalDeduction;

        const responsePayload = {
            success: true,
            employeeName: user.name,
            month: monthQuery,
            totalDaysInMonth,
            monthlySalary,
            perDaySalary: parseFloat(perDaySalary.toFixed(2)),
            attendanceSummary: {
                presentDays: presentDaysCount,
                absentDays: absentDaysCount,
                halfDays: halfDaysCount,
            },
            totalDeduction: parseFloat(totalDeduction.toFixed(2)),
            finalSalary: parseFloat(finalSalary.toFixed(2))
        };

        return NextResponse.json(responsePayload);

    } catch (err: any) {
        console.error("Salary Calculation Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
