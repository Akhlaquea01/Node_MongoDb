import cron from 'node-cron';
import logger from '../utils/logger.js';

const cronLogger = logger.child({ module: 'cron' });

/**
 * Cron Service - Handles all scheduled tasks using node-cron
 * 
 * Cron Expression Format:
 * * * * * * *
 * | | | | | |
 * | | | | | day of week (0-7, 0 or 7 is Sunday)
 * | | | | month (1-12)
 * | | | day of month (1-31)
 * | | hour (0-23)
 * | minute (0-59)
 * second (0-59) - optional
 */

interface TaskExecutionInfo {
    lastExecution: Date | null;
    executionCount: number;
    description: string;
}

class CronService {
    private tasks: Map<string, cron.ScheduledTask> = new Map();
    private stoppedTasks: Set<string> = new Set(); // Track stopped tasks
    private taskExecutions: Map<string, TaskExecutionInfo> = new Map(); // Track execution info

    /**
     * Example 1: Run every minute
     * Use case: Health checks, monitoring, quick periodic tasks
     */
    startMinuteTask() {
        const taskId = 'minute-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Minute task already running');
            return;
        }

        const task = cron.schedule('* * * * *', () => {
            cronLogger.info('⏰ Running task every minute - Example: Health check');
            // Track execution
            const execInfo = this.taskExecutions.get(taskId) || { lastExecution: null, executionCount: 0, description: 'Runs every minute' };
            execInfo.lastExecution = new Date();
            execInfo.executionCount++;
            this.taskExecutions.set(taskId, execInfo);
            // Example: Check system health, update metrics, etc.
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        this.taskExecutions.set(taskId, { lastExecution: null, executionCount: 0, description: 'Runs every minute' });
        cronLogger.info('✅ Minute task started');
    }

    /**
     * Example 2: Run every 5 minutes
     * Use case: Data synchronization, cache refresh, periodic cleanup
     */
    startFiveMinuteTask() {
        const taskId = 'five-minute-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Five minute task already running');
            return;
        }

        const task = cron.schedule('*/5 * * * *', () => {
            cronLogger.info('⏰ Running task every 5 minutes - Example: Cache refresh');
            // Example: Refresh cache, sync data, cleanup temp files
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Five minute task started');
    }

    /**
     * Example 3: Run every hour at minute 0
     * Use case: Hourly reports, hourly backups, hourly aggregations
     */
    startHourlyTask() {
        const taskId = 'hourly-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Hourly task already running');
            return;
        }

        const task = cron.schedule('0 * * * *', () => {
            cronLogger.info('⏰ Running task every hour - Example: Hourly report generation');
            // Example: Generate hourly reports, aggregate metrics, send hourly summaries
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Hourly task started');
    }

    /**
     * Example 4: Run daily at midnight (00:00)
     * Use case: Daily backups, daily reports, daily cleanup, EOD processing
     */
    startDailyTask() {
        const taskId = 'daily-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Daily task already running');
            return;
        }

        const task = cron.schedule('0 0 * * *', () => {
            cronLogger.info('⏰ Running task daily at midnight - Example: Daily backup');
            // Example: Daily backups, daily reports, cleanup old data, reset daily counters
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Daily task started');
    }

    /**
     * Example 5: Run daily at specific time (e.g., 2:30 AM)
     * Use case: Scheduled maintenance, off-peak processing
     */
    startScheduledDailyTask() {
        const taskId = 'scheduled-daily-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Scheduled daily task already running');
            return;
        }

        const task = cron.schedule('30 2 * * *', () => {
            cronLogger.info('⏰ Running task daily at 2:30 AM - Example: Maintenance window');
            // Example: Database maintenance, log rotation, scheduled maintenance
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Scheduled daily task started (2:30 AM)');
    }

    /**
     * Example 6: Run every weekday (Monday-Friday) at 9 AM
     * Use case: Business hours tasks, weekday-only operations
     */
    startWeekdayTask() {
        const taskId = 'weekday-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Weekday task already running');
            return;
        }

        const task = cron.schedule('0 9 * * 1-5', () => {
            cronLogger.info('⏰ Running task on weekdays at 9 AM - Example: Business hours notification');
            // Example: Send daily business reports, start business processes
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Weekday task started (Mon-Fri 9 AM)');
    }

    /**
     * Example 7: Run every Sunday at midnight
     * Use case: Weekly reports, weekly maintenance, weekly resets
     */
    startWeeklyTask() {
        const taskId = 'weekly-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Weekly task already running');
            return;
        }

        const task = cron.schedule('0 0 * * 0', () => {
            cronLogger.info('⏰ Running task every Sunday at midnight - Example: Weekly report');
            // Example: Weekly reports, weekly backups, weekly analytics
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Weekly task started (Sunday midnight)');
    }

    /**
     * Example 8: Run on first day of month at midnight
     * Use case: Monthly reports, monthly billing, monthly resets
     */
    startMonthlyTask() {
        const taskId = 'monthly-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Monthly task already running');
            return;
        }

        const task = cron.schedule('0 0 1 * *', () => {
            cronLogger.info('⏰ Running task on 1st of every month - Example: Monthly billing');
            // Example: Monthly billing, monthly reports, monthly analytics
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Monthly task started (1st of month)');
    }

    /**
     * Example 9: Run every 30 seconds (using seconds field)
     * Use case: Real-time monitoring, frequent checks
     */
    startThirtySecondTask() {
        const taskId = 'thirty-second-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Thirty second task already running');
            return;
        }

        const task = cron.schedule('*/30 * * * * *', () => {
            cronLogger.info('⏰ Running task every 30 seconds - Example: Real-time monitoring');
            // Example: Check system status, monitor queues, real-time metrics
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Thirty second task started');
    }

    /**
     * Example 10: Run at specific times (9 AM, 12 PM, 3 PM, 6 PM)
     * Use case: Scheduled notifications, multiple daily runs
     */
    startMultipleDailyTask() {
        const taskId = 'multiple-daily-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Multiple daily task already running');
            return;
        }

        const task = cron.schedule('0 9,12,15,18 * * *', () => {
            cronLogger.info('⏰ Running task at 9 AM, 12 PM, 3 PM, 6 PM - Example: Scheduled notifications');
            // Example: Send scheduled notifications, periodic updates
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Multiple daily task started (9 AM, 12 PM, 3 PM, 6 PM)');
    }

    /**
     * Example 11: Run every 10 minutes during business hours (9 AM - 5 PM, Mon-Fri)
     * Use case: Business hours monitoring, frequent business operations
     */
    startBusinessHoursTask() {
        const taskId = 'business-hours-task';
        if (this.tasks.has(taskId)) {
            cronLogger.warn('Business hours task already running');
            return;
        }

        const task = cron.schedule('*/10 9-17 * * 1-5', () => {
            cronLogger.info('⏰ Running task every 10 minutes during business hours - Example: Business monitoring');
            // Example: Monitor business metrics, check queues, process business tasks
        }, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info('✅ Business hours task started (every 10 min, 9 AM-5 PM, Mon-Fri)');
    }

    /**
     * Example 12: Custom cron expression
     * Use case: Flexible scheduling for any pattern
     */
    startCustomTask(cronExpression: string, taskName: string, callback: () => void) {
        const taskId = `custom-${taskName}`;
        if (this.tasks.has(taskId)) {
            cronLogger.warn(`Custom task ${taskName} already running`);
            return;
        }

        if (!cron.validate(cronExpression)) {
            throw new Error(`Invalid cron expression: ${cronExpression}`);
        }

        const task = cron.schedule(cronExpression, callback, {
            timezone: 'UTC'
        });

        this.tasks.set(taskId, task);
        cronLogger.info(`✅ Custom task started: ${taskName} with expression: ${cronExpression}`);
    }

    /**
     * Stop a specific task
     */
    stopTask(taskId: string) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.stop();
            this.tasks.delete(taskId);
            cronLogger.info(`🛑 Task stopped: ${taskId}`);
            return true;
        }
        cronLogger.warn(`Task not found: ${taskId}`);
        return false;
    }

    /**
     * Start a stopped task
     */
    startTask(taskId: string) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.start();
            this.stoppedTasks.delete(taskId);
            cronLogger.info(`▶️ Task started: ${taskId}`);
            return true;
        }
        cronLogger.warn(`Task not found: ${taskId}`);
        return false;
    }

    /**
     * Get status of all tasks
     * Returns status with API-friendly task IDs (e.g., 'minute' instead of 'minute-task')
     */
    getTasksStatus() {
        const status: Record<string, { 
            running: boolean; 
            expression?: string;
            description?: string;
            lastExecution?: string | null;
            executionCount?: number;
        }> = {};
        
        // Map internal task IDs to API task IDs and their expressions
        const taskMapping: Record<string, { apiId: string; expression: string }> = {
            'minute-task': { apiId: 'minute', expression: '* * * * *' },
            'five-minute-task': { apiId: 'five-minute', expression: '*/5 * * * *' },
            'hourly-task': { apiId: 'hourly', expression: '0 * * * *' },
            'daily-task': { apiId: 'daily', expression: '0 0 * * *' },
            'scheduled-daily-task': { apiId: 'scheduled-daily', expression: '30 2 * * *' },
            'weekday-task': { apiId: 'weekday', expression: '0 9 * * 1-5' },
            'weekly-task': { apiId: 'weekly', expression: '0 0 * * 0' },
            'monthly-task': { apiId: 'monthly', expression: '0 0 1 * *' },
            'thirty-second-task': { apiId: 'thirty-second', expression: '*/30 * * * * *' },
            'multiple-daily-task': { apiId: 'multiple-daily', expression: '0 9,12,15,18 * * *' },
            'business-hours-task': { apiId: 'business-hours', expression: '*/10 9-17 * * 1-5' }
        };
        
        // Check all tasks in the Map
        // If a task exists in the Map, it's running (tasks are removed from Map when stopped)
        this.tasks.forEach((task, internalTaskId) => {
            const mapping = taskMapping[internalTaskId];
            const execInfo = this.taskExecutions.get(internalTaskId);
            
            if (mapping) {
                // Task is running if it exists in Map
                status[mapping.apiId] = {
                    running: true,
                    expression: mapping.expression,
                    description: execInfo?.description || 'Scheduled task',
                    lastExecution: execInfo?.lastExecution?.toISOString() || null,
                    executionCount: execInfo?.executionCount || 0
                };
            } else {
                // Custom task (not in mapping)
                status[internalTaskId] = {
                    running: true,
                    expression: undefined,
                    description: execInfo?.description || 'Custom task',
                    lastExecution: execInfo?.lastExecution?.toISOString() || null,
                    executionCount: execInfo?.executionCount || 0
                };
            }
        });
        
        // Include all known tasks, even if not currently running
        Object.entries(taskMapping).forEach(([internalTaskId, { apiId, expression }]) => {
            if (!status[apiId]) {
                const execInfo = this.taskExecutions.get(internalTaskId);
                status[apiId] = {
                    running: false,
                    expression,
                    description: execInfo?.description || 'Scheduled task',
                    lastExecution: execInfo?.lastExecution?.toISOString() || null,
                    executionCount: execInfo?.executionCount || 0
                };
            }
        });
        
        return status;
    }

    /**
     * Stop all tasks
     */
    stopAllTasks() {
        this.tasks.forEach((task, taskId) => {
            task.stop();
            cronLogger.info(`🛑 Stopped task: ${taskId}`);
        });
        this.tasks.clear();
        cronLogger.info('🛑 All cron tasks stopped');
    }

    /**
     * Initialize all default tasks
     */
    initializeAllTasks() {
        cronLogger.info('🚀 Initializing all cron tasks...');
        this.startMinuteTask();
        this.startFiveMinuteTask();
        this.startHourlyTask();
        this.startDailyTask();
        this.startScheduledDailyTask();
        this.startWeekdayTask();
        this.startWeeklyTask();
        this.startMonthlyTask();
        this.startThirtySecondTask();
        this.startMultipleDailyTask();
        this.startBusinessHoursTask();
        cronLogger.info('✅ All cron tasks initialized');
    }
}

export default new CronService();

