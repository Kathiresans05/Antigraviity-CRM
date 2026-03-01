import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import moment from 'moment';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // HR/Admin roles validation
        const role = (session.user as any)?.role;
        if (!['Admin', 'Manager', 'HR', 'HR Manager'].includes(role)) {
            return NextResponse.json({ error: "Forbidden: Only HR/Admins can generate offer letters." }, { status: 403 });
        }

        await connectToDatabase();
        const { id: userId } = await params;

        const employee = await User.findById(userId).lean();
        if (!employee) {
            return NextResponse.json({ error: "Employee not found." }, { status: 404 });
        }

        // Generate PDF using pdf-lib
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const { width, height } = page.getSize();

        let cursorY = height - 80;

        // Header
        page.drawText('ANTIGRAVIITY SYSTEMS', { x: 50, y: cursorY, size: 24, font: boldFont, color: rgb(0, 0.4, 0.6) });
        cursorY -= 30;
        page.drawText('OFFER OF EMPLOYMENT', { x: 50, y: cursorY, size: 16, font: boldFont });
        cursorY -= 40;

        // Date
        const todayStr = moment().format('MMMM DD, YYYY');
        page.drawText(`Date: ${todayStr}`, { x: 50, y: cursorY, size: 10, font });
        cursorY -= 30;

        // Salutation & Addressee
        const empName = employee.name || 'Candidate';
        const empAddress = employee.address || 'Address not provided';
        page.drawText(`To: ${empName}`, { x: 50, y: cursorY, size: 12, font: boldFont });
        cursorY -= 15;
        page.drawText(`${empAddress}`, { x: 50, y: cursorY, size: 10, font });
        cursorY -= 40;

        // Body Text
        page.drawText(`Dear ${empName},`, { x: 50, y: cursorY, size: 12, font });
        cursorY -= 25;

        const bodyLines = [
            `We are delighted to offer you the position of ${employee.role || 'Employee'} in the ${employee.department || 'General'}`,
            `department at Antigraviity Systems. Your expected date of joining is ${moment(employee.joinDate || new Date()).format('MMMM DD, YYYY')}.`,
            ``,
            `Compensation & Benefits:`,
            `Your annual Cost to Company (CTC) will be INR ${((employee.salaryDetails?.basicSalary || 0) + (employee.salaryDetails?.hra || 0) + (employee.salaryDetails?.conveyance || 0)) * 12
            }/- subject to statutory`,
            `deductions as applicable by law.`,
            ``,
            `Employment Type: ${employee.employmentType || 'Full-Time'}`,
            `Probation Period: ${employee.probationPeriod || 6} months from the date of joining.`,
            ``,
            `This offer is contingent upon successful background verification and submission `,
            `of all requisite documents including your PAN, Aadhar, and educational certificates.`,
            ``,
            `We are excited to welcome you to the team and wish you a long and successful career `,
            `with us.`,
            ``,
            `Sincerely,`,
        ];

        for (const line of bodyLines) {
            page.drawText(line, { x: 50, y: cursorY, size: 11, font });
            cursorY -= 18;
        }

        cursorY -= 20;

        // Signature
        page.drawText(`Human Resources Department`, { x: 50, y: cursorY, size: 11, font: boldFont });
        cursorY -= 15;
        page.drawText(`Antigraviity Systems`, { x: 50, y: cursorY, size: 11, font });

        // Footer bounding
        page.drawText(`____________________________________________________________________`, { x: 50, y: 50, size: 10, font });
        page.drawText(`Authorized Signatory`, { x: 50, y: 35, size: 10, font });

        page.drawText(`Accepted By: ___________________________`, { x: 350, y: 35, size: 10, font });

        // Serialize to bytes
        const pdfBytes = await pdfDoc.save();
        const buffer = Buffer.from(pdfBytes);

        // Return the PDF buffer as a downloadable file
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Offer_Letter_${employee.employeeCode || empName.replace(/\s+/g, '_')}.pdf"`,
            },
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Failed to generate offer letter.", details: e.message }, { status: 500 });
    }
}
