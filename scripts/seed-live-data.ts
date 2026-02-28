import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment';
import User from '../src/models/User';
import Project from '../src/models/Project';
import Task from '../src/models/Task';
import Attendance from '../src/models/Attendance';
import Leave from '../src/models/Leave';

dotenv.config({ path: '.env.local' });

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("Connected to database...");

        const jananiId = "699f2d0ee7881ce44222b1d3";
        const kathiresanId = "699e91b096d8f2b6e2130e2e";

        // 1. Projects
        console.log("Seeding projects...");
        await Project.deleteMany({});
        const projects = await Project.insertMany([
            {
                name: "Zoho CRM Integration",
                description: "Seamlessly integrate Zoho CRM with our internal dashboards.",
                startDate: moment().subtract(2, 'weeks').toDate(),
                endDate: moment().add(4, 'weeks').toDate(),
                status: "In Progress",
                progress: 65,
                client: "Zoho Corp"
            },
            {
                name: "Employee Portal V2",
                description: "Upgrading the employee portal with new UI and performance fixes.",
                startDate: moment().subtract(1, 'month').toDate(),
                endDate: moment().subtract(1, 'day').toDate(),
                status: "Delayed",
                progress: 85,
                client: "Internal"
            },
            {
                name: "Security Audit 2026",
                description: "Quarterly security and compliance check.",
                startDate: moment().subtract(1, 'week').toDate(),
                endDate: moment().add(1, 'week').toDate(),
                status: "At Risk",
                progress: 20,
                client: "Compliance Team"
            },
            {
                name: "Mobile App Re-design",
                description: "Complete overhaul of the mobile application interface.",
                startDate: moment().subtract(5, 'weeks').toDate(),
                endDate: moment().add(10, 'weeks').toDate(),
                status: "In Progress",
                progress: 40,
                client: "Product Team"
            }
        ]);

        // 2. Tasks
        console.log("Seeding tasks...");
        await Task.deleteMany({});
        const taskData = [];

        // Distribute tasks across 4 weeks for the trend chart
        for (let i = 0; i < 40; i++) {
            const weekOffset = Math.floor(i / 10); // 0, 1, 2, 3
            const isCompleted = Math.random() > 0.4;
            const status = isCompleted ? 'Completed' : 'In Progress';
            
            // Generate a date within that week
            const updatedAt = moment().subtract(weekOffset, 'weeks').startOf('week').add(Math.random() * 6, 'days').toDate();
            const due = moment().add(Math.random() * 20 - 10, 'days').format('YYYY-MM-DD');

            taskData.push({
                title: `Task #${i + 1} for ${projects[i % 4].name}`,
                project: projects[i % 4].name, // Using project name as per schema
                assignedTo: Math.random() > 0.5 ? jananiId : kathiresanId,
                status: status,
                priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                due: due,
                updatedAt: updatedAt,
                createdAt: moment(updatedAt).subtract(2, 'days').toDate()
            });
        }
        await Task.insertMany(taskData);

        // 3. Attendance
        console.log("Seeding attendance...");
        await Attendance.deleteMany({ userId: kathiresanId });
        const attendanceData = [];
        const weekStart = moment().startOf('week').add(1, 'days'); // Monday

        // Seed last 10 days of attendance
        for (let i = 0; i < 10; i++) {
            const day = moment().subtract(i, 'days');
            if (day.day() === 0 || day.day() === 6) continue; // Skip weekends

            attendanceData.push({
                userId: kathiresanId,
                date: day.startOf('day').toDate(),
                status: Math.random() > 0.2 ? 'Present' : 'Late',
                checkIn: day.clone().set({ hour: 9, minute: Math.random() * 30 }).toDate(),
                checkOut: day.clone().set({ hour: 18, minute: Math.random() * 30 }).toDate()
            });
        }
        await Attendance.insertMany(attendanceData);

        console.log("Seed completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
}

seed();
