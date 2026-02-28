import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import JobOpening from '@/models/JobOpening';

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        await connectToDatabase();
        const allJobsCount = await JobOpening.countDocuments();
        const job = await JobOpening.findById(params.id);

        if (!job) {
            return NextResponse.json({
                error: 'Job not found in database',
                debug: {
                    requestedId: params.id,
                    idType: typeof params.id,
                    totalJobsInDb: allJobsCount
                }
            }, { status: 404 });
        }

        if (job.status !== 'Active') {
            return NextResponse.json({
                error: `Job found but its status is '${job.status}'. Only 'Active' jobs are visible publicly.`,
                status: job.status
            }, { status: 403 });
        }

        return NextResponse.json({
            id: job._id,
            title: job.title,
            department: job.department,
            jobType: job.jobType,
            workMode: job.workMode,
            location: job.location,
            openings: job.openings,
            experienceRequired: job.experienceRequired,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryRange: job.salaryMin && job.salaryMax ? `₹${(job.salaryMin / 100000).toFixed(1)}L – ₹${(job.salaryMax / 100000).toFixed(1)}L` : 'Negotiable',
            skills: job.skills || [],
            responsibilities: job.responsibilities || '',
            qualifications: job.qualifications || '',
            benefits: job.benefits || '',
            publishedAt: job.publishedAt,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
