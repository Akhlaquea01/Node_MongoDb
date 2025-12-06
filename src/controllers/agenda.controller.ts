import { Request, Response } from 'express';
import agendaService from '../services/agenda.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Helper to check if Agenda is ready
 */
const checkAgendaReady = (res: Response): boolean => {
    if (!agendaService.isReady()) {
        res.status(503).json(
            new ApiResponse(503, null, 'Agenda service is initializing. Please wait a moment and try again.')
        );
        return false;
    }
    return true;
};

/**
 * Schedule a job to run now
 */
export const scheduleJobNow = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobName, data } = req.body;
    
    if (!jobName) {
        return res.status(400).json(
            new ApiResponse(400, null, 'jobName is required')
        );
    }

    const job = await agendaService.scheduleJobNow(jobName, data || {});
    
    return res.status(201).json(
        new ApiResponse(201, {
            jobId: job.attrs._id,
            jobName: job.attrs.name,
            scheduledAt: job.attrs.nextRunAt
        }, 'Job scheduled to run now')
    );
});

/**
 * Schedule a job for later
 * Supports:
 * - Absolute time: ISO date string (e.g., "2025-12-06T20:00:00Z")
 * - Relative time in seconds: number (e.g., 30 = run in 30 seconds)
 * - Relative time string: "in 30 seconds", "in 5 minutes", "in 1 hour"
 */
export const scheduleJob = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobName, when, data } = req.body;
    
    if (!jobName || when === undefined || when === null) {
        return res.status(400).json(
            new ApiResponse(400, null, 'jobName and when are required. "when" can be: ISO date string, number of seconds, or "in X seconds/minutes/hours"')
        );
    }

    // Accept number (seconds), string (ISO date or "in X seconds"), or Date
    const job = await agendaService.scheduleJob(jobName, when, data || {});
    
    return res.status(201).json(
        new ApiResponse(201, {
            jobId: job.attrs._id,
            jobName: job.attrs.name,
            scheduledAt: job.attrs.nextRunAt,
            currentTime: new Date(),
            timeUntilExecution: job.attrs.nextRunAt ? 
                Math.max(0, new Date(job.attrs.nextRunAt).getTime() - Date.now()) : null
        }, 'Job scheduled successfully')
    );
});

/**
 * Schedule a recurring job
 */
export const scheduleRecurringJob = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobName, interval, data } = req.body;
    
    if (!jobName || !interval) {
        return res.status(400).json(
            new ApiResponse(400, null, 'jobName and interval are required (e.g., "5 minutes", "1 hour", "1 day")')
        );
    }

    const job = await agendaService.scheduleRecurringJob(jobName, interval, data || {});
    
    return res.status(201).json(
        new ApiResponse(201, {
            jobId: job.attrs._id,
            jobName: job.attrs.name,
            interval: job.attrs.repeatInterval,
            nextRunAt: job.attrs.nextRunAt
        }, 'Recurring job scheduled successfully')
    );
});

/**
 * Get all jobs
 */
export const getJobs = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobName, status } = req.query;
    
    const query: any = {};
    if (jobName) {
        query.name = jobName;
    }
    if (status === 'running') {
        query.lockedAt = { $exists: true, $ne: null };
    } else if (status === 'failed') {
        query.failedAt = { $exists: true };
    }

    const jobs = await agendaService.getJobs(query);
    
    const jobsData = jobs.map(job => {
        const now = new Date();
        const nextRun = job.attrs.nextRunAt ? new Date(job.attrs.nextRunAt) : null;
        const isRunning = !!job.attrs.lockedAt;
        const isFailed = !!job.attrs.failedAt;
        
        // Get status from MongoDB meta field, fallback to computed status
        // If meta doesn't exist, initialize it based on current job state
        let meta = (job.attrs as any).meta;
        if (!meta) {
            // Job was created before meta field was added - initialize it
            meta = {
                status: isRunning ? 'in-progress' : isFailed ? 'error' : 
                       (nextRun && nextRun > now) ? 'pending' : 'completed',
                createdAt: job.attrs.lastModifiedAt || new Date()
            };
        }
        
        let status = meta.status || (isRunning ? 'in-progress' : isFailed ? 'error' : 
                      (nextRun && nextRun > now) ? 'pending' : 'completed');
        
        // Map old status names to new ones
        if (status === 'running') {status = 'in-progress';}
        if (status === 'failed') {status = 'error';}
        if (status === 'scheduled') {status = 'pending';}
        
        // If job is locked but status is not in-progress, update it
        if (isRunning && status !== 'in-progress') {
            status = 'in-progress';
        }
        
        return {
            jobId: job.attrs._id,
            name: job.attrs.name,
            data: job.attrs.data,
            status, // pending, in-progress, completed, error
            nextRunAt: job.attrs.nextRunAt,
            lastRunAt: job.attrs.lastRunAt,
            lastFinishedAt: job.attrs.lastFinishedAt,
            lockedAt: job.attrs.lockedAt,
            failedAt: job.attrs.failedAt,
            failCount: job.attrs.failCount,
            failReason: job.attrs.failReason,
            repeatInterval: job.attrs.repeatInterval,
            timeUntilExecution: nextRun && nextRun > now ? 
                Math.max(0, nextRun.getTime() - now.getTime()) : null,
            isRunning,
            isFailed,
            // Include meta data from MongoDB (or computed if missing)
            meta: meta || {}
        };
    });

    return res.status(200).json(
        new ApiResponse(200, { jobs: jobsData, count: jobsData.length }, 'Jobs retrieved successfully')
    );
});

/**
 * Get a specific job by ID
 */
export const getJob = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobId } = req.params;
    
    const job = await agendaService.getJob(jobId);
    
    if (!job) {
        return res.status(404).json(
            new ApiResponse(404, null, 'Job not found')
        );
    }

    return res.status(200).json(
        new ApiResponse(200, {
            jobId: job.attrs._id,
            name: job.attrs.name,
            data: job.attrs.data,
            nextRunAt: job.attrs.nextRunAt,
            lastRunAt: job.attrs.lastRunAt,
            lastFinishedAt: job.attrs.lastFinishedAt,
            lockedAt: job.attrs.lockedAt,
            failedAt: job.attrs.failedAt,
            failCount: job.attrs.failCount,
            failReason: job.attrs.failReason,
            repeatInterval: job.attrs.repeatInterval,
        }, 'Job retrieved successfully')
    );
});

/**
 * Cancel a job
 */
export const cancelJob = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobId } = req.params;
    
    await agendaService.cancelJob(jobId);
    
    return res.status(200).json(
        new ApiResponse(200, { jobId }, 'Job cancelled successfully')
    );
});

/**
 * Retry a failed job
 */
export const retryJob = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobId } = req.params;
    
    const job = await agendaService.retryJob(jobId);
    
    return res.status(200).json(
        new ApiResponse(200, {
            jobId: job.attrs._id,
            jobName: job.attrs.name
        }, 'Job retried successfully')
    );
});

/**
 * Get running jobs
 */
export const getRunningJobs = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const jobs = await agendaService.getRunningJobs();
    
    const jobsData = jobs.map(job => ({
        jobId: job.attrs._id,
        name: job.attrs.name,
        data: job.attrs.data,
        lockedAt: job.attrs.lockedAt,
    }));

    return res.status(200).json(
        new ApiResponse(200, { jobs: jobsData, count: jobsData.length }, 'Running jobs retrieved successfully')
    );
});

/**
 * Get failed jobs
 */
export const getFailedJobs = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const jobs = await agendaService.getFailedJobs();
    
    const jobsData = jobs.map(job => ({
        jobId: job.attrs._id,
        name: job.attrs.name,
        data: job.attrs.data,
        failedAt: job.attrs.failedAt,
        failCount: job.attrs.failCount,
        failReason: job.attrs.failReason,
    }));

    return res.status(200).json(
        new ApiResponse(200, { jobs: jobsData, count: jobsData.length }, 'Failed jobs retrieved successfully')
    );
});

/**
 * Get jobs by name
 */
export const getJobsByName = asyncHandler(async (req: Request, res: Response) => {
    if (!checkAgendaReady(res)) {return;}
    
    const { jobName } = req.params;
    
    const jobs = await agendaService.getJobsByName(jobName);
    
    const jobsData = jobs.map(job => ({
        jobId: job.attrs._id,
        name: job.attrs.name,
        data: job.attrs.data,
        nextRunAt: job.attrs.nextRunAt,
        lastRunAt: job.attrs.lastRunAt,
        failedAt: job.attrs.failedAt,
        failCount: job.attrs.failCount,
    }));

    return res.status(200).json(
        new ApiResponse(200, { jobs: jobsData, count: jobsData.length }, 'Jobs retrieved successfully')
    );
});

