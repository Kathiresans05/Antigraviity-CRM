import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import User from "@/backend/models/User";
import Payroll from "@/backend/models/Payroll";
import moment from "moment";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        // Payroll Dashboard is likely for Admins/HR
        if (!['Admin', 'HR', 'HR Manager', 'Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
        }

        await connectToDatabase();

        const currentMonthYear = moment().format('MMMM YYYY');

        // Fetch active employees
        const employees = await User.find({ status: 'active' })
            .select('_id name email department salaryDetails');

        // Fetch existing payrolls for the current month
        const existingPayrolls = await Payroll.find({ monthYear: currentMonthYear })
            .populate('userId', 'name department');

        const existingMap = new Map(
            existingPayrolls
                .filter(p => p.userId && p.userId._id)
                .map(p => [p.userId._id.toString(), p])
        );

        const payrollData = [];
        let totalGross = 0;
        let totalDeductions = 0;
        let totalBonus = 0;
        let pendingCount = 0;

        // Generate missing payrolls dynamically for the dashboard
        for (const emp of employees) {
            let record = existingMap.get(emp._id.toString());

            if (!record) {
                // Dynamically generate default values based on onboarding salaryDetails
                const baseSalary = emp.salaryDetails?.basicSalary || 0;
                const bonus = 0; // Defaulting to 0 for now as per plan
                const taxDeductions = (emp.salaryDetails?.professionalTax || 0) +
                    (emp.salaryDetails?.pfEmployee || 0) +
                    (emp.salaryDetails?.esiEmployee || 0);

                const netPay = Math.max(0, (baseSalary + bonus) - taxDeductions);

                record = {
                    userId: emp,
                    monthYear: currentMonthYear,
                    baseSalary,
                    bonus,
                    deductions: taxDeductions,
                    netPay,
                    status: 'Pending'
                };
            }

            // Aggregate KPIs
            totalGross += record.baseSalary;
            totalDeductions += record.deductions;
            totalBonus += record.bonus;
            if (record.status === 'Pending') pendingCount++;

            payrollData.push({
                _id: record._id || `temp_${emp._id}`,
                userId: emp._id,
                employeeName: record.userId?.name || emp.name,
                department: record.userId?.department || emp.department,
                baseSalary: record.baseSalary,
                bonus: record.bonus,
                deductions: record.deductions,
                netPay: record.netPay,
                status: record.status
            });
        }

        const stats = {
            totalGross,
            totalBonus,
            totalDeductions,
            netPayout: (totalGross + totalBonus) - totalDeductions,
            pendingCount
        };

        // Calculate 6-month historical trend
        const trendData = [];
        for (let i = 5; i >= 0; i--) {
            const m = moment().subtract(i, 'months');
            const monthLabel = m.format('MMM');
            const monthFullYear = m.format('MMMM YYYY');

            // For the current month, use the live dynamic stats we just calculated
            if (i === 0) {
                trendData.push({ month: monthLabel, amount: stats.netPayout });
                continue;
            }

            // For previous months, query processed payrolls
            const pastPayrolls = await Payroll.find({ monthYear: monthFullYear, status: 'Processed' });
            const monthTotal = pastPayrolls.reduce((acc, p) => acc + p.netPay, 0);

            trendData.push({ month: monthLabel, amount: monthTotal });
        }

        // Calculate YoY/MoM growth for the chart badge (comparing current to previous month)
        let growthStr = "+0.0%";
        let isUp = true;
        if (trendData.length >= 2) {
            const current = trendData[5].amount;
            const previous = trendData[4].amount;
            if (previous > 0) {
                const pct = ((current - previous) / previous) * 100;
                isUp = pct >= 0;
                growthStr = `${isUp ? '+' : ''}${pct.toFixed(1)}% MoM`;
            } else if (current > 0) {
                growthStr = "+100% MoM"; // Went from 0 to something
            }
        }

        return NextResponse.json({
            monthYear: currentMonthYear,
            payrolls: payrollData,
            stats,
            trend: {
                data: trendData,
                growth: growthStr,
                isUp
            }
        });

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

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
        }

        await connectToDatabase();
        const currentMonthYear = moment().format('MMMM YYYY');

        // Fetch active employees
        const employees = await User.find({ status: 'active' });

        // Fetch existing payrolls for the current month
        const existingPayrolls = await Payroll.find({ monthYear: currentMonthYear, status: 'Pending' });
        const existingMap = new Map(existingPayrolls.map(p => [p.userId.toString(), p]));

        let processedCount = 0;

        for (const emp of employees) {
            let record = existingMap.get(emp._id.toString());

            if (record) {
                record.status = 'Processed';
                record.processedDate = new Date();
                await record.save();
                processedCount++;
            } else {
                // Determine if a non-pending record already exists
                const alreadyProcessed = await Payroll.exists({ monthYear: currentMonthYear, userId: emp._id, status: 'Processed' });

                if (!alreadyProcessed) {
                    // Create and process new record dynamically based on onboarding profile
                    const baseSalary = emp.salaryDetails?.basicSalary || 0;
                    const bonus = 0;
                    const taxDeductions = (emp.salaryDetails?.professionalTax || 0) +
                        (emp.salaryDetails?.pfEmployee || 0) +
                        (emp.salaryDetails?.esiEmployee || 0);
                    const netPay = Math.max(0, (baseSalary + bonus) - taxDeductions);

                    await Payroll.create({
                        userId: emp._id,
                        monthYear: currentMonthYear,
                        baseSalary,
                        bonus,
                        deductions: taxDeductions,
                        netPay,
                        status: 'Processed',
                        processedDate: new Date()
                    });
                    processedCount++;
                }
            }
        }

        return NextResponse.json({ message: `Successfully processed payroll for ${processedCount} employees.`, count: processedCount });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager', 'Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
        }

        const body = await req.json();
        const { userId, status, monthYear, baseSalary, bonus, deductions, action } = body;

        if (!userId || !monthYear) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        // Check if employee exists
        const emp = await User.findById(userId);
        if (!emp) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        let record = await Payroll.findOne({ monthYear, userId });

        if (record) {
            if (action === 'edit') {
                if (baseSalary !== undefined) record.baseSalary = Number(baseSalary);
                if (bonus !== undefined) record.bonus = Number(bonus);
                if (deductions !== undefined) record.deductions = Number(deductions);

                record.netPay = Math.max(0, (record.baseSalary + record.bonus) - record.deductions);
            } else if (status) {
                record.status = status;
            }
            await record.save();
        } else {
            // Need to generate dynamically
            let finalBase = baseSalary !== undefined ? Number(baseSalary) : (emp.salaryDetails?.basicSalary || 0);
            let finalBonus = bonus !== undefined ? Number(bonus) : 0;
            let finalDeductions = deductions !== undefined ? Number(deductions) :
                ((emp.salaryDetails?.professionalTax || 0) + (emp.salaryDetails?.pfEmployee || 0) + (emp.salaryDetails?.esiEmployee || 0));

            const netPay = Math.max(0, (finalBase + finalBonus) - finalDeductions);

            record = await Payroll.create({
                userId: emp._id,
                monthYear,
                baseSalary: finalBase,
                bonus: finalBonus,
                deductions: finalDeductions,
                netPay,
                status: status || 'Pending'
            });
        }

        return NextResponse.json({ message: action === 'edit' ? "Successfully updated payroll details." : `Successfully updated payroll status.`, payroll: record });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
