const mongoose = require('mongoose');

// Mocking some paths for quick run
const MONGO_URI = 'mongodb://localhost:27017/crm_db'; // Assuming standard local mongo for this workspace

const JobOpeningSchema = new mongoose.Schema({
    status: String,
    title: String,
}, { timestamps: true });

async function debug() {
    try {
        await mongoose.connect(MONGO_URI);
        const Job = mongoose.models.JobOpening || mongoose.model('JobOpening', JobOpeningSchema);
        const jobs = await Job.find({});
        console.log('--- DB JOBS ---');
        jobs.forEach(j => {
            console.log(`ID: ${j._id}, Status: ${j.status}, Title: ${j.title}`);
        });
        mongoose.connection.close();
    } catch (e) {
        console.error(e);
    }
}

debug();
