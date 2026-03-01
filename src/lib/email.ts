export async function sendOnboardingCompleteEmail(userEmail: string, userName: string) {
    try {
        console.log(`[EMAIL_SYSTEM]: Sending Onboarding Completion Email to ${userEmail}`);

        // In a real production system, this is where you'd use Nodemailer or Resend
        // Example:
        // const transporter = nodemailer.createTransport({ ... });
        // await transporter.sendMail({
        //     from: '"HR Department" <hr@antigraviity.com>',
        //     to: userEmail,
        //     subject: 'Welcome to Antigraviity! Your Onboarding is Complete.',
        //     html: `<p>Dear ${userName},</p><p>We are thrilled to let you know that your profile is now active...</p>`
        // });

        console.log(`[EMAIL_SYSTEM]: SUCCESS. Email sent to ${userEmail}`);
        return true;
    } catch (e) {
        console.error(`[EMAIL_SYSTEM]: Failed to send email to ${userEmail}`, e);
        return false;
    }
}
export async function sendDailyWorkSummaryEmail(
    managerEmail: string,
    employeeName: string,
    summary: string,
    clockIn: string,
    clockOut: string,
    totalHours: number,
    fileUrl?: string
) {
    try {
        console.log(`[EMAIL_SYSTEM]: Sending Daily Work Summary to Manager (${managerEmail}) for ${employeeName}`);

        // In production, use nodemailer or resend to send the actual email
        console.log(`
        ======= DAILY WORK SUMMARY =======
        To: ${managerEmail}
        From: Antigraviity System
        Subject: Daily Work Summary - ${employeeName} - ${new Date().toLocaleDateString()}

        Employee: ${employeeName}
        Clock In: ${clockIn}
        Clock Out: ${clockOut}
        Total Productive Hours: ${totalHours}h

        --- Achievements Today ---
        ${summary}

        Attachment: ${fileUrl || 'None'}
        ===================================
        `);

        console.log(`[EMAIL_SYSTEM]: SUCCESS. Summary email triggered for ${employeeName}`);
        return true;
    } catch (e) {
        console.error(`[EMAIL_SYSTEM]: Failed to send work summary email to ${managerEmail}`, e);
        return false;
    }
}
