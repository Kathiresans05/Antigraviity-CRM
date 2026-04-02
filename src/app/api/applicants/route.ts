import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/backend/lib/auth-config';
import connectToDatabase from '@/backend/lib/mongodb';
import Applicant from '@/backend/models/Applicant';
import JobOpening from '@/backend/models/JobOpening';
import moment from 'moment';

const SEED_APPLICANTS = [
    { name: 'Arjun Mehta', email: 'arjun.mehta@candidate.com', phone: '9876543210', jobTitle: 'Senior Frontend Developer', department: 'Engineering', stage: 'Interview Round 1', rating: 4.8, experienceYears: 5, skills: ['React', 'TypeScript'], source: 'LinkedIn', appliedAt: moment().subtract(2, 'days').toDate() },
    { name: 'Sara Khan', email: 'sara.khan@candidate.com', phone: '9876543211', jobTitle: 'Senior Frontend Developer', department: 'Engineering', stage: 'Screening', rating: 4.2, experienceYears: 4, skills: ['Vue.js', 'CSS'], source: 'Referral', appliedAt: moment().subtract(5, 'days').toDate() },
    { name: 'Rahul Soni', email: 'rahul.soni@candidate.com', phone: '9876543212', jobTitle: 'Backend Architect', department: 'Engineering', stage: 'Offered', rating: 4.9, experienceYears: 7, skills: ['Node.js', 'AWS', 'MongoDB'], source: 'Job Board', appliedAt: moment().subtract(10, 'days').toDate() },
    { name: 'Priya Nair', email: 'priya.nair@candidate.com', phone: '9876543213', jobTitle: 'Product Manager', department: 'Product', stage: 'Applied', rating: 3.8, experienceYears: 3, skills: ['Agile', 'Jira'], source: 'Career Page', appliedAt: moment().subtract(1, 'days').toDate() },
    { name: 'David Miller', email: 'david.miller@candidate.com', phone: '9876543214', jobTitle: 'Backend Architect', department: 'Engineering', stage: 'Hired', rating: 5.0, experienceYears: 9, skills: ['Go', 'Kubernetes', 'AWS'], source: 'Referral', appliedAt: moment().subtract(20, 'days').toDate() },
    { name: 'Anita Desai', email: 'anita.desai@candidate.com', phone: '9876543215', jobTitle: 'Senior Frontend Developer', department: 'Engineering', stage: 'Interview Round 2', rating: 4.5, experienceYears: 4, skills: ['React', 'Redux'], source: 'LinkedIn', appliedAt: moment().subtract(7, 'days').toDate() },
    { name: 'Karthik Rajan', email: 'karthik.rajan@candidate.com', phone: '9876543216', jobTitle: 'DevOps Engineer', department: 'Infrastructure', stage: 'HR Round', rating: 4.3, experienceYears: 5, skills: ['Docker', 'Jenkins', 'Terraform'], source: 'Job Board', appliedAt: moment().subtract(4, 'days').toDate() },
    { name: 'Meena Suresh', email: 'meena.suresh@candidate.com', phone: '9876543217', jobTitle: 'Product Manager', department: 'Product', stage: 'Rejected', rating: 3.2, experienceYears: 2, skills: ['Product Strategy'], source: 'Career Page', appliedAt: moment().subtract(12, 'days').toDate() },
    { name: 'Vikram Patel', email: 'vikram.patel@candidate.com', phone: '9876543218', jobTitle: 'DevOps Engineer', department: 'Infrastructure', stage: 'Applied', rating: 4.6, experienceYears: 6, skills: ['AWS', 'Ansible', 'Python'], source: 'LinkedIn', appliedAt: moment().subtract(1, 'days').toDate() },
    { name: 'Riya Sharma', email: 'riya.sharma@candidate.com', phone: '9876543219', jobTitle: 'Senior Frontend Developer', department: 'Engineering', stage: 'Screening', rating: 4.0, experienceYears: 3, skills: ['Angular', 'JavaScript'], source: 'Job Board', appliedAt: moment().subtract(3, 'days').toDate() },
];

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get('jobId');

        await connectToDatabase();
        const count = await Applicant.countDocuments();
        if (count === 0) {
            // Get first job ID for seeding
            const firstJob = await JobOpening.findOne();
            const seeded = SEED_APPLICANTS.map(a => ({ ...a, jobId: firstJob?._id || new (require('mongoose').Types.ObjectId)() }));
            await Applicant.insertMany(seeded);
        }

        const query = jobId ? { jobId } : {};
        const applicants = await Applicant.find(query).sort({ appliedAt: -1 });

        const formatted = applicants.map(a => ({
            id: a._id,
            name: a.name,
            email: a.email,
            phone: a.phone || '',
            jobId: a.jobId,
            jobTitle: a.jobTitle || '',
            department: a.department || '',
            stage: a.stage,
            rating: a.rating,
            experienceYears: a.experienceYears,
            skills: a.skills || [],
            source: a.source || 'Job Board',
            notes: a.notes || '',
            offerLetterSent: a.offerLetterSent,
            applied: moment(a.appliedAt).fromNow(),
            appliedDate: moment(a.appliedAt).format('DD MMM YYYY'),
            daysInPipeline: moment().diff(moment(a.appliedAt), 'days'),
        }));

        return NextResponse.json({ applicants: formatted });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        if (!body.name || !body.email || !body.jobId) {
            return NextResponse.json({ error: 'Name, email, and jobId are required.' }, { status: 400 });
        }

        await connectToDatabase();
        const existing = await Applicant.findOne({ email: body.email, jobId: body.jobId });
        if (existing) return NextResponse.json({ error: 'Applicant already exists for this job.' }, { status: 409 });

        // Get job info
        const job = await JobOpening.findById(body.jobId);
        const applicant = await Applicant.create({
            ...body,
            jobTitle: job?.title || '',
            department: job?.department || '',
            skills: Array.isArray(body.skills) ? body.skills : (body.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            stage: 'Applied',
            appliedAt: new Date(),
        });

        return NextResponse.json({ message: 'Applicant added.', applicant }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, stage, rating, notes } = body;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();
        const applicant = await Applicant.findById(id);
        if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const prevStage = applicant.stage;

        if (stage) {
            applicant.stage = stage;
            applicant.stageHistory.push({ stage, changedAt: new Date(), changedBy: (session.user as any).name || 'HR' });

            // Auto-increment hired count when moved to Hired
            if (stage === 'Hired' && prevStage !== 'Hired') {
                await JobOpening.findByIdAndUpdate(applicant.jobId, { $inc: { hiredCount: 1 } });
                // Check if job should auto-close
                const job = await JobOpening.findById(applicant.jobId);
                if (job && job.hiredCount >= job.openings) {
                    job.status = 'Closed';
                    await job.save();
                }
            }
            // Decrement if un-Hired
            if (prevStage === 'Hired' && stage !== 'Hired') {
                await JobOpening.findByIdAndUpdate(applicant.jobId, { $inc: { hiredCount: -1 } });
            }
        }
        if (rating !== undefined) applicant.rating = Math.min(5, Math.max(0, Number(rating)));
        if (notes !== undefined) applicant.notes = notes;

        await applicant.save();
        return NextResponse.json({ message: 'Updated.', applicant });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();
        await Applicant.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Deleted.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
