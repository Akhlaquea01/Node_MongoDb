import { Request, Response } from 'express';
import cronService from '../services/cron.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Get status of all cron tasks
 */
export const getCronTasksStatus = asyncHandler(async (req: Request, res: Response) => {
    const status = cronService.getTasksStatus();
    
    return res.status(200).json(
        new ApiResponse(200, status, 'Cron tasks status retrieved successfully')
    );
});

/**
 * Start a specific cron task
 */
export const startCronTask = asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    
    const taskMethods: Record<string, () => void> = {
        'minute': () => cronService.startMinuteTask(),
        'five-minute': () => cronService.startFiveMinuteTask(),
        'hourly': () => cronService.startHourlyTask(),
        'daily': () => cronService.startDailyTask(),
        'scheduled-daily': () => cronService.startScheduledDailyTask(),
        'weekday': () => cronService.startWeekdayTask(),
        'weekly': () => cronService.startWeeklyTask(),
        'monthly': () => cronService.startMonthlyTask(),
        'thirty-second': () => cronService.startThirtySecondTask(),
        'multiple-daily': () => cronService.startMultipleDailyTask(),
        'business-hours': () => cronService.startBusinessHoursTask(),
    };

    if (taskMethods[taskId]) {
        taskMethods[taskId]();
        return res.status(200).json(
            new ApiResponse(200, { taskId }, `Cron task ${taskId} started successfully`)
        );
    }

    return res.status(404).json(
        new ApiResponse(404, null, `Cron task ${taskId} not found`)
    );
});

/**
 * Stop a specific cron task
 */
export const stopCronTask = asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    
    const stopped = cronService.stopTask(taskId);
    
    if (stopped) {
        return res.status(200).json(
            new ApiResponse(200, { taskId }, `Cron task ${taskId} stopped successfully`)
        );
    }

    return res.status(404).json(
        new ApiResponse(404, null, `Cron task ${taskId} not found`)
    );
});

/**
 * Start a stopped cron task
 */
export const resumeCronTask = asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    
    const started = cronService.startTask(taskId);
    
    if (started) {
        return res.status(200).json(
            new ApiResponse(200, { taskId }, `Cron task ${taskId} resumed successfully`)
        );
    }

    return res.status(404).json(
        new ApiResponse(404, null, `Cron task ${taskId} not found`)
    );
});

/**
 * Create a custom cron task
 */
export const createCustomCronTask = asyncHandler(async (req: Request, res: Response) => {
    const { cronExpression, taskName, description } = req.body;
    
    if (!cronExpression || !taskName) {
        return res.status(400).json(
            new ApiResponse(400, null, 'cronExpression and taskName are required')
        );
    }

    cronService.startCustomTask(
        cronExpression,
        taskName,
        () => {
            console.log(`Custom task ${taskName} executed: ${description || 'No description'}`);
        }
    );

    return res.status(201).json(
        new ApiResponse(201, { cronExpression, taskName }, 'Custom cron task created successfully')
    );
});

/**
 * Initialize all default cron tasks
 */
export const initializeAllCronTasks = asyncHandler(async (req: Request, res: Response) => {
    cronService.initializeAllTasks();
    
    return res.status(200).json(
        new ApiResponse(200, null, 'All cron tasks initialized successfully')
    );
});

/**
 * Stop all cron tasks
 */
export const stopAllCronTasks = asyncHandler(async (req: Request, res: Response) => {
    cronService.stopAllTasks();
    
    return res.status(200).json(
        new ApiResponse(200, null, 'All cron tasks stopped successfully')
    );
});

