import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import connectToDatabase from '@/lib/mongodb';
import ManpowerRequest from '@/models/ManpowerRequest';
import JobOpening from '@/models/JobOpening';

const SEED_REQUESTS = [
    { department: 'Engineering', position: 'Senior Frontend Developer', count: 3, reason: 'New Project', budgetApproved: true, requestedBy: 'Raj Kumar', approvalStatus: 'Approved', approvedBy: 'Admin', notes: 'Urgent for Q1 delivery.' },
    { department: 'Product', position: 'Product Manager', count: 1, reason: 'Expansion', budgetApproved: true, requestedBy: 'Anita Desai', approvalStatus: 'Approved', approvedBy: 'Admin' },
    { department: 'Marketing', position: 'Digital Marketing Lead', count: 2, reason: 'New Project', budgetApproved: false, requestedBy: 'Meena Suresh', approvalStatus: 'Pending' },
    { department: 'Finance', position: 'Financial Analyst', count: 1, reason: 'Replacement', budgetApproved: true, requestedBy: 'Vijay R', approvalStatus: 'Rejected', notes: 'Budget not finalized.' },
];

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const count = await ManpowerRequest.countDocuments();
        if (count === 0) await ManpowerRequest.insertMany(SEED_REQUESTS);

        const requests = await ManpowerRequest.find().sort({ createdAt: -1 });
        return NextResponse.json({ requests });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        if (!body.department || !body.position || !body.requestedBy) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectToDatabase();
        const request = await ManpowerRequest.create(body);
        return NextResponse.json({ message: 'Request created.', request }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, approvalStatus, convertToJob } = body;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();
        const request = await ManpowerRequest.findById(id);
        if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (approvalStatus) {
            request.approvalStatus = approvalStatus;
            request.approvedBy = (session.user as any).name;
        }

        // Convert approved request to a job opening
        if (convertToJob && request.approvalStatus === 'Approved' && !request.convertedToJob) {
            const job = await JobOpening.create({
                title: request.position,
                department: request.department,
                openings: request.count,
                hiredCount: 0,
                status: 'Draft',
                manpowerRequestId: request._id,
            });
            request.convertedToJob = true;
            request.jobOpeningId = job._id;
        }

        await request.save();
        return NextResponse.json({ message: 'Updated.', request });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
