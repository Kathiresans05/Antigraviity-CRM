import { Request, Response } from "express";
import MonitoringDevice from "../models/MonitoringDevice";
import MonitoringAuditLog from "../models/AuditLog";
import mongoose from "mongoose";

export const registerDevice = async (req: Request, res: Response) => {
    try {
        const { deviceId, deviceName, employeeId, employeeName, metadata } = req.body;

        if (!deviceId || !employeeId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const device = await MonitoringDevice.findOneAndUpdate(
            { deviceId },
            { 
                deviceName, 
                employeeId, 
                employeeName, 
                metadata,
                isOnline: true,
                lastHeartbeat: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, device });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createAuditLog = async (req: Request, res: Response) => {
    try {
        const { adminId, adminName, employeeId, employeeName, action, viewPurpose } = req.body;

        const log = new MonitoringAuditLog({
            adminId,
            adminName,
            employeeId,
            employeeName,
            action,
            viewPurpose,
            startTime: new Date()
        });

        await log.save();
        res.status(201).json({ success: true, logId: log._id });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateAuditLogEnd = async (req: Request, res: Response) => {
    try {
        const { logId } = req.params;
        const endTime = new Date();

        const log = await MonitoringAuditLog.findById(logId);
        if (log) {
            log.endTime = endTime;
            log.durationSeconds = Math.round((endTime.getTime() - log.startTime.getTime()) / 1000);
            await log.save();
        }

        res.status(200).json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const logs = await MonitoringAuditLog.find().sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ success: true, logs });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getLiveDevices = async (req: Request, res: Response) => {
    try {
        const devices = await MonitoringDevice.find({ isOnline: true });
        res.status(200).json({ success: true, devices });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
