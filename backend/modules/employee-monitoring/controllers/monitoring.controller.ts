import { Request, Response } from 'express';
import { ActivityRecord } from '../models/ActivityRecord';
import { Screenshot } from '../models/Screenshot';
import { MonitoringAlert } from '../models/MonitoringAlert';
import mongoose from 'mongoose';

export const syncActivity = async (req: Request, res: Response) => {
    try {
        const { userId, employeeName, activeApp, windowTitle, mouseClicks, keystrokes, idleSeconds, activeSeconds } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const newRecord = new ActivityRecord({
            userId,
            employeeName,
            activeApp,
            windowTitle,
            mouseClicks,
            keystrokes,
            idleSeconds,
            activeSeconds,
            isIdle: idleSeconds > 60 // Simple heuristic: 1 min of no movement is idle
        });

        await newRecord.save();

        // Check for high idle alert (> 10 mins)
        if (idleSeconds > 600) {
            const alert = new MonitoringAlert({
                userId,
                employeeName,
                type: 'idle',
                message: `${employeeName} has been idle for ${Math.round(idleSeconds / 60)} minutes.`,
                severity: 'medium'
            });
            await alert.save();
        }

        res.status(201).json({ success: true });
    } catch (err: any) {
        console.error("[MonitoringCtrl] Sync Error:", err.message);
        res.status(500).json({ error: "Failed to sync activity" });
    }
};

export const uploadScreenshot = async (req: Request, res: Response) => {
    try {
        const { userId, employeeName, imageUrl, activeApp, windowTitle } = req.body;

        if (!userId || !imageUrl) {
            return res.status(400).json({ error: "userId and imageUrl are required" });
        }

        const newScreenshot = new Screenshot({
            userId,
            employeeName,
            imageUrl, // Expecting Base64 for now as per plan
            activeApp,
            windowTitle
        });

        await newScreenshot.save();

        res.status(201).json({ success: true });
    } catch (err: any) {
        console.error("[MonitoringCtrl] Screenshot Error:", err.message);
        res.status(500).json({ error: "Failed to upload screenshot" });
    }
};

export const getStats = async (req: Request, res: Response) => {
    try {
        const { days = 1 } = req.query;
        const since = new Date(Date.now() - (Number(days) * 24 * 60 * 60 * 1000));

        const stats = await ActivityRecord.aggregate([
            { $match: { timestamp: { $gte: since } } },
            { $group: {
                _id: "$userId",
                employeeName: { $first: "$employeeName" },
                totalActiveSeconds: { $sum: "$activeSeconds" },
                totalIdleSeconds: { $sum: "$idleSeconds" },
                avgKeystrokes: { $avg: "$keystrokes" },
                avgMouseClicks: { $avg: "$mouseClicks" },
                lastActiveApp: { $last: "$activeApp" },
                lastWindowTitle: { $last: "$windowTitle" },
                lastSeen: { $max: "$timestamp" }
            }}
        ]);

        res.json({ success: true, stats });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getScreenshots = async (req: Request, res: Response) => {
    try {
        const { userId, date } = req.query;
        let query: any = {};
        if (userId) query.userId = userId;
        if (date) {
            const start = new Date(date as string);
            const end = new Date(start.getTime() + 86400000);
            query.capturedAt = { $gte: start, $lt: end };
        }

        const screenshots = await Screenshot.find(query).sort({ capturedAt: -1 }).limit(100);
        res.json({ success: true, screenshots });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getAlerts = async (req: Request, res: Response) => {
    try {
        const alerts = await MonitoringAlert.find({}).sort({ timestamp: -1 }).limit(50);
        res.json({ success: true, alerts });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
