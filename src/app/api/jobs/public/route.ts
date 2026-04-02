import { NextResponse } from 'next/server';
import connectToDatabase from '@/backend/lib/mongodb';
import JobOpening from '@/backend/models/JobOpening';

export async function GET() {
    try {
        await connectToDatabase();
        // Only fetch active jobs for the public careers page
        const jobs = await JobOpening.find({ status: 'Active' }).sort({ createdAt: -1 });

        const formatted = jobs.map(j => ({
            id: j._id,
            title: j.title,
            department: j.department,
            jobType: j.jobType,
            workMode: j.workMode,
            location: j.location,
            openings: j.openings,
            experienceRequired: j.experienceRequired,
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            salaryRange: j.salaryMin && j.salaryMax ? `₹${(j.salaryMin / 100000).toFixed(1)}L – ₹${(j.salaryMax / 100000).toFixed(1)}L` : 'Negotiable',
            skills: j.skills || [],
            responsibilities: j.responsibilities || '',
            qualifications: j.qualifications || '',
            benefits: j.benefits || '',
            publishedAt: j.publishedAt,
        }));

        return NextResponse.json({ jobs: formatted });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
