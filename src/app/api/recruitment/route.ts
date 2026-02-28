import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import connectToDatabase from '@/lib/mongodb';
import Recruitment from '@/models/Recruitment';
import moment from 'moment';

// Seed data for when the DB has no candidates yet
const SEED_CANDIDATES = [
    { name: 'Arjun Mehta', email: 'arjun.mehta@candidate.com', phone: '9876543210', role: 'Sr. Frontend Developer', department: 'Engineering', status: 'Interview', rating: 4.8, source: 'LinkedIn', experienceYears: 5, appliedAt: moment().subtract(2, 'days').toDate() },
    { name: 'Sara Khan', email: 'sara.khan@candidate.com', phone: '9876543211', role: 'Product Manager', department: 'Product', status: 'Screening', rating: 4.2, source: 'Referral', experienceYears: 4, appliedAt: moment().subtract(5, 'days').toDate() },
    { name: 'Rahul Soni', email: 'rahul.soni@candidate.com', phone: '9876543212', role: 'DevOps Engineer', department: 'Infrastructure', status: 'Offered', rating: 4.9, source: 'Job Board', experienceYears: 6, appliedAt: moment().subtract(7, 'days').toDate() },
    { name: 'Priya Nair', email: 'priya.nair@candidate.com', phone: '9876543213', role: 'UI/UX Designer', department: 'Design', status: 'Applied', rating: 3.8, source: 'Career Page', experienceYears: 2, appliedAt: moment().subtract(0, 'hours').toDate() },
    { name: 'David Miller', email: 'david.miller@candidate.com', phone: '9876543214', role: 'Backend Architect', department: 'Engineering', status: 'Hired', rating: 5.0, source: 'Referral', experienceYears: 9, appliedAt: moment().subtract(14, 'days').toDate() },
    { name: 'Anita Desai', email: 'anita.desai@candidate.com', phone: '9876543215', role: 'Quality Analyst', department: 'QA', status: 'Interview', rating: 4.5, source: 'LinkedIn', experienceYears: 3, appliedAt: moment().subtract(1, 'days').toDate() },
    { name: 'Karthik Rajan', email: 'karthik.rajan@candidate.com', phone: '9876543216', role: 'Data Engineer', department: 'Data', status: 'Technical', rating: 4.3, source: 'Job Board', experienceYears: 4, appliedAt: moment().subtract(3, 'days').toDate() },
    { name: 'Meena Suresh', email: 'meena.suresh@candidate.com', phone: '9876543217', role: 'HR Specialist', department: 'HR', status: 'Rejected', rating: 3.2, source: 'Career Page', experienceYears: 2, appliedAt: moment().subtract(10, 'days').toDate() },
    { name: 'Vikram Patel', email: 'vikram.patel@candidate.com', phone: '9876543218', role: 'Cloud Architect', department: 'Infrastructure', status: 'Applied', rating: 4.6, source: 'LinkedIn', experienceYears: 7, appliedAt: moment().subtract(1, 'days').toDate() },
    { name: 'Riya Sharma', email: 'riya.sharma@candidate.com', phone: '9876543219', role: 'Marketing Manager', department: 'Marketing', status: 'Screening', rating: 4.0, source: 'Job Board', experienceYears: 5, appliedAt: moment().subtract(4, 'days').toDate() },
];

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager', 'Manager'].includes(userRole)) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
        }

        await connectToDatabase();

        // Seed if empty
        const count = await Recruitment.countDocuments();
        if (count === 0) {
            await Recruitment.insertMany(SEED_CANDIDATES);
        }

        const candidates = await Recruitment.find().sort({ appliedAt: -1 });

        // Build stats
        const total = candidates.length;
        const hired = candidates.filter(c => c.status === 'Hired').length;
        const inInterview = candidates.filter(c => c.status === 'Interview').length;
        const offered = candidates.filter(c => c.status === 'Offered').length;
        const todayStr = moment().format('YYYY-MM-DD');
        const interviewsToday = candidates.filter(c =>
            c.status === 'Interview' && moment(c.appliedAt).format('YYYY-MM-DD') === todayStr
        ).length;

        // Funnel counts
        const funnelCounts = {
            Applied: candidates.filter(c => c.status === 'Applied').length,
            Screening: candidates.filter(c => c.status === 'Screening').length,
            Interview: candidates.filter(c => c.status === 'Interview').length,
            Technical: candidates.filter(c => c.status === 'Technical').length,
            Hired: hired,
        };

        // Department breakdown (top priorities = high count departments)
        const deptMap: Record<string, number> = {};
        for (const c of candidates) {
            if (c.department) deptMap[c.department] = (deptMap[c.department] || 0) + 1;
        }
        const topDepts = Object.entries(deptMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([dept, count]) => ({ dept, count }));

        const stats = {
            total,
            hired,
            inInterview,
            offered,
            interviewsToday,
            funnelCounts,
            topDepts,
        };

        const formatted = candidates.map(c => ({
            id: c._id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            role: c.role,
            department: c.department,
            status: c.status,
            rating: c.rating,
            source: c.source || 'Job Board',
            experienceYears: c.experienceYears || 0,
            notes: c.notes || '',
            applied: moment(c.appliedAt).fromNow(),
            appliedDate: moment(c.appliedAt).format('MMM DD, YYYY'),
        }));

        return NextResponse.json({ candidates: formatted, stats });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, phone, role, department, source, experienceYears, notes } = body;

        if (!name || !email || !role || !department) {
            return NextResponse.json({ error: 'Missing required fields: name, email, role, department' }, { status: 400 });
        }

        await connectToDatabase();

        const existing = await Recruitment.findOne({ email });
        if (existing) {
            return NextResponse.json({ error: 'A candidate with this email already exists.' }, { status: 409 });
        }

        const candidate = await Recruitment.create({
            name, email, phone, role, department,
            source: source || 'Job Board',
            experienceYears: experienceYears || 0,
            notes: notes || '',
            status: 'Applied',
            rating: 0,
            appliedAt: new Date(),
        });

        return NextResponse.json({ message: 'Candidate added successfully.', candidate }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager', 'Manager'].includes(userRole)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { id, status, rating, notes } = body;

        if (!id) return NextResponse.json({ error: 'Candidate ID required' }, { status: 400 });

        await connectToDatabase();

        const candidate = await Recruitment.findById(id);
        if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

        const validStatuses = ['Applied', 'Screening', 'Interview', 'Technical', 'Offered', 'Hired', 'Rejected'];
        if (status && validStatuses.includes(status)) candidate.status = status;
        if (rating !== undefined) candidate.rating = Math.min(5, Math.max(0, Number(rating)));
        if (notes !== undefined) candidate.notes = notes;

        await candidate.save();

        return NextResponse.json({ message: 'Candidate updated successfully.', candidate });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();
        await Recruitment.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Candidate deleted.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
