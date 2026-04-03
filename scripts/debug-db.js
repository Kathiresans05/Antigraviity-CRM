import mongoose from 'mongoose';
import connectToDatabase from './backend/lib/mongodb';
import JobOpening from './backend/models/JobOpening';

async function debug() {
    await connectToDatabase();
    const jobs = await JobOpening.find({});
    console.log('Total Jobs:', jobs.length);
    jobs.forEach(j => {
        console.log(`ID: ${j._id}, Status: ${j.status}, Title: ${j.title}`);
    });
    process.exit(0);
}

debug();
