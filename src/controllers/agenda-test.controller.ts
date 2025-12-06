import { Request, Response } from 'express';
import agendaService from '../services/agenda.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

/**
 * Test endpoint to schedule a job and see it execute
 */
export const testAgendaJob = asyncHandler(async (req: Request, res: Response) => {
    if (!agendaService.isReady()) {
        return res.status(503).json(
            new ApiResponse(503, null, 'Agenda service is initializing. Please wait a moment and try again.')
        );
    }
    
    const { jobName = 'process-data', data = {} } = req.body;

    // Schedule job to run now
    const job = await agendaService.scheduleJobNow(jobName, {
        ...data,
        test: true,
        scheduledAt: new Date().toISOString()
    });

    return res.status(200).json(
        new ApiResponse(200, {
            jobId: job.attrs._id,
            jobName: job.attrs.name,
            nextRunAt: job.attrs.nextRunAt,
            message: 'Job scheduled. Check server logs to see execution.'
        }, 'Test job scheduled successfully')
    );
});

/**
 * Get agenda status and diagnostics
 */
export const getAgendaStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!agendaService.isReady()) {
        return res.status(503).json(
            new ApiResponse(503, {
                initialized: false,
                message: 'Agenda service is initializing. Please wait a moment and try again.'
            }, 'Agenda service is initializing')
        );
    }
    
    const allJobs = await agendaService.getJobs();
    const runningJobs = await agendaService.getRunningJobs();
    const failedJobs = await agendaService.getFailedJobs();

    // Check MongoDB collection
    const db = mongoose.connection.db;
    let collectionCount = 0;
    if (db) {
        collectionCount = await db.collection('agendaJobs').countDocuments();
    }

    return res.status(200).json(
        new ApiResponse(200, {
            totalJobs: allJobs.length,
            runningJobs: runningJobs.length,
            failedJobs: failedJobs.length,
            mongoCollectionCount: collectionCount,
            jobs: allJobs.map(job => ({
                id: job.attrs._id,
                name: job.attrs.name,
                nextRunAt: job.attrs.nextRunAt,
                lastRunAt: job.attrs.lastRunAt,
                lastFinishedAt: job.attrs.lastFinishedAt,
                lockedAt: job.attrs.lockedAt,
                failedAt: job.attrs.failedAt,
                failCount: job.attrs.failCount,
                status: job.attrs.lockedAt ? 'running' : job.attrs.failedAt ? 'failed' : 'pending'
            }))
        }, 'Agenda status retrieved successfully')
    );
});

