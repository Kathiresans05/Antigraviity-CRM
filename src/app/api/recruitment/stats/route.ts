import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import connectToDatabase from '@/lib/mongodb';
import JobOpening from '@/models/JobOpening';
import Applicant from '@/models/Applicant';
import moment from 'moment';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();

        const [jobs, applicants] = await Promise.all([
            JobOpening.find(),
            Applicant.find(),
        ]);

        const now = moment();
        const thisMonth = now.format('YYYY-MM');

        // KPIs
        const activeOpenings = jobs.filter(j => j.status === 'Active').length;
        const totalApplicants = applicants.length;
        const inInterview = applicants.filter(a => ['Interview Round 1', 'Interview Round 2', 'HR Round'].includes(a.stage)).length;
        const interviewsToday = applicants.filter(a =>
            ['Interview Round 1', 'Interview Round 2', 'HR Round'].includes(a.stage) &&
            moment(a.updatedAt).format('YYYY-MM-DD') === now.format('YYYY-MM-DD')
        ).length;
        const hiredThisMonth = applicants.filter(a =>
            a.stage === 'Hired' && moment(a.updatedAt).format('YYYY-MM') === thisMonth
        ).length;
        const offered = applicants.filter(a => a.stage === 'Offered').length;
        const hired = applicants.filter(a => a.stage === 'Hired').length;
        const offerAcceptanceRate = offered + hired > 0 ? Math.round((hired / (offered + hired)) * 100) : 0;

        // Avg time to hire (days from applied to hired)
        const hiredApplicants = applicants.filter(a => a.stage === 'Hired' && a.appliedAt);
        const avgTimeToHire = hiredApplicants.length > 0
            ? Math.round(hiredApplicants.reduce((sum, a) => sum + moment(a.updatedAt).diff(moment(a.appliedAt), 'days'), 0) / hiredApplicants.length)
            : 0;

        // Funnel counts
        const stages = ['Applied', 'Screening', 'Interview Round 1', 'Interview Round 2', 'HR Round', 'Offered', 'Hired', 'Rejected'];
        const funnelCounts = Object.fromEntries(stages.map(s => [s, applicants.filter(a => a.stage === s).length]));

        // Monthly hiring trend (last 6 months)
        const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
            const m = moment().subtract(5 - i, 'months');
            const label = m.format('MMM');
            const count = applicants.filter(a =>
                a.stage === 'Hired' && moment(a.updatedAt).format('YYYY-MM') === m.format('YYYY-MM')
            ).length;
            return { label, count };
        });

        // Dept breakdown
        const deptMap: Record<string, number> = {};
        for (const a of applicants) {
            if (a.department) deptMap[a.department] = (deptMap[a.department] || 0) + 1;
        }
        const deptBreakdown = Object.entries(deptMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([dept, count]) => ({ dept, count }));

        return NextResponse.json({
            kpis: {
                activeOpenings,
                totalApplicants,
                interviewsToday,
                hiredThisMonth,
                offerAcceptanceRate,
                avgTimeToHire,
                inInterview,
            },
            funnelCounts,
            monthlyTrend,
            deptBreakdown,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
