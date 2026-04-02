import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/backend/lib/auth-config';
import connectToDatabase from '@/backend/lib/mongodb';
import JobOpening from '@/backend/models/JobOpening';
import moment from 'moment';

const SEED_JOBS = [
    { title: 'Senior Frontend Developer', department: 'Engineering', jobType: 'Full-time', workMode: 'Hybrid', location: 'Chennai', openings: 3, hiredCount: 1, experienceRequired: '3-5 years', salaryMin: 800000, salaryMax: 1400000, priority: 'High', status: 'Active', skills: ['React', 'TypeScript', 'Next.js'], targetJoiningDate: moment().add(30, 'days').toDate(), hiringManager: 'Raj Kumar', hrApprover: 'Priya S', responsibilities: 'Build scalable frontend apps.', qualifications: 'B.Tech/BE in CS or related field.', publishedAt: moment().subtract(5, 'days').toDate() },
    { title: 'Backend Architect', department: 'Engineering', jobType: 'Full-time', workMode: 'Onsite', location: 'Bangalore', openings: 2, hiredCount: 0, experienceRequired: '6+ years', salaryMin: 1500000, salaryMax: 2500000, priority: 'High', status: 'Active', skills: ['Node.js', 'MongoDB', 'AWS'], targetJoiningDate: moment().add(45, 'days').toDate(), hiringManager: 'Suresh M', hrApprover: 'Priya S', responsibilities: 'Design and maintain backend systems.', qualifications: 'B.Tech in CS with cloud certifications.', publishedAt: moment().subtract(3, 'days').toDate() },
    { title: 'Product Manager', department: 'Product', jobType: 'Full-time', workMode: 'Remote', location: 'Mumbai', openings: 1, hiredCount: 0, experienceRequired: '4-7 years', salaryMin: 1200000, salaryMax: 2000000, priority: 'Medium', status: 'Active', skills: ['Product Strategy', 'Agile', 'Roadmapping'], targetJoiningDate: moment().add(20, 'days').toDate(), hiringManager: 'Anita D', hrApprover: 'Priya S', responsibilities: 'Lead product roadmap and lifecycle.', qualifications: 'MBA or equivalent.', publishedAt: moment().subtract(7, 'days').toDate() },
    { title: 'UI/UX Designer', department: 'Design', jobType: 'Full-time', workMode: 'Hybrid', location: 'Chennai', openings: 2, hiredCount: 2, experienceRequired: '2-4 years', salaryMin: 600000, salaryMax: 1000000, priority: 'Low', status: 'Closed', skills: ['Figma', 'Prototyping', 'User Research'], targetJoiningDate: moment().subtract(10, 'days').toDate(), hiringManager: 'Kavya R', hrApprover: 'Priya S', responsibilities: 'Design user-centric interfaces.', qualifications: 'Degree in Design or equivalent.', publishedAt: moment().subtract(30, 'days').toDate() },
    { title: 'DevOps Engineer', department: 'Infrastructure', jobType: 'Full-time', workMode: 'Remote', location: 'Anywhere', openings: 2, hiredCount: 0, experienceRequired: '3-6 years', salaryMin: 900000, salaryMax: 1600000, priority: 'High', status: 'Pending', skills: ['Kubernetes', 'Docker', 'CI/CD', 'AWS'], targetJoiningDate: moment().add(60, 'days').toDate(), hiringManager: 'Ravi T', hrApprover: 'Priya S', responsibilities: 'Manage CI/CD pipelines and cloud infra.', qualifications: 'B.Tech with DevOps certifications.', publishedAt: null },
];

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const count = await JobOpening.countDocuments();
        if (count === 0) await JobOpening.insertMany(SEED_JOBS);

        const jobs = await JobOpening.find().sort({ createdAt: -1 });

        const formatted = jobs.map(j => ({
            id: j._id,
            title: j.title,
            department: j.department,
            jobType: j.jobType,
            workMode: j.workMode,
            location: j.location,
            openings: j.openings,
            hiredCount: j.hiredCount,
            remaining: Math.max(0, j.openings - j.hiredCount),
            fillPercent: Math.round((j.hiredCount / Math.max(1, j.openings)) * 100),
            priority: j.priority,
            status: j.status,
            experienceRequired: j.experienceRequired,
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            salaryRange: j.salaryMin && j.salaryMax ? `₹${(j.salaryMin / 100000).toFixed(1)}L – ₹${(j.salaryMax / 100000).toFixed(1)}L` : 'Negotiable',
            targetJoiningDate: j.targetJoiningDate ? moment(j.targetJoiningDate).format('DD MMM YYYY') : '—',
            hiringManager: j.hiringManager || '—',
            hrApprover: j.hrApprover || '—',
            skills: j.skills || [],
            responsibilities: j.responsibilities || '',
            qualifications: j.qualifications || '',
            benefits: j.benefits || '',
            publishedAt: j.publishedAt ? moment(j.publishedAt).fromNow() : 'Not published',
            publishedPlatforms: (j.publishedPlatforms || []).map((p: any) => ({
                name: p.name,
                status: p.status,
                postedAt: p.postedAt ? moment(p.postedAt).fromNow() : null
            })),
        }));

        return NextResponse.json({ jobs: formatted });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager'].includes(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        await connectToDatabase();

        const selectedPlatforms: string[] = body.selectedPlatforms || [];
        const isPublish = body.submitType === 'publish';

        const publishedPlatforms = isPublish && selectedPlatforms.length > 0
            ? selectedPlatforms.map((name: string) => ({
                name,
                status: 'Posted',
                postedAt: new Date()
            }))
            : [];

        const job = await JobOpening.create({
            ...body,
            hiredCount: 0,
            status: isPublish ? 'Active' : body.submitType === 'submit' ? 'Pending' : 'Draft',
            publishedAt: isPublish ? new Date() : null,
            publishedPlatforms,
            skills: Array.isArray(body.skills) ? body.skills : (body.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        });

        return NextResponse.json({ message: 'Job created.', job }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, status, hiredCountDelta, ...rest } = body;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();
        const job = await JobOpening.findById(id);
        if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (status) job.status = status;
        if (hiredCountDelta) {
            job.hiredCount = Math.max(0, job.hiredCount + hiredCountDelta);
            if (job.hiredCount >= job.openings) job.status = 'Closed';
        }
        Object.assign(job, rest);
        await job.save();

        return NextResponse.json({ message: 'Updated.', job });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userRole = (session.user as any).role;
        if (!['Admin', 'HR Manager', 'HR'].includes(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();
        await JobOpening.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Deleted.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
