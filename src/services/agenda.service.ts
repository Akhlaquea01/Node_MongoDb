import { Agenda } from 'agenda';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { DB_NAME } from '../constants.js';

const agendaLogger = logger.child({ module: 'agenda' });

/**
 * Agenda Service - MongoDB-based Job Queue
 * 
 * HOW IT WORKS:
 * 1. Jobs are stored in MongoDB collection 'agendaJobs'
 * 2. Agenda checks for jobs every 10 seconds (processEvery)
 * 3. When a job's nextRunAt time arrives, Agenda executes it
 * 4. Jobs can run immediately, at a specific time, or recurring
 * 
 * USAGE:
 * - scheduleJobNow(name, data) - Run job immediately
 * - scheduleJob(name, date, data) - Run job at specific time
 * - scheduleRecurringJob(name, interval, data) - Run job repeatedly
 */

class AgendaService {
    private agenda: Agenda | null = null;
    private isInitialized: boolean = false;

    /**
     * Initialize Agenda with Mongoose connection
     * Must be called after MongoDB connection is established
     */
    /**
     * Initialize Agenda with standalone MongoDB connection
     * Uses its own connection to avoid version conflicts with Mongoose
     */
    async initialize(): Promise<void> {
        try {
            agendaLogger.info('🔄 Starting Agenda initialization...');

            if (this.isInitialized && this.agenda) {
                agendaLogger.warn('Agenda already initialized');
                return;
            }

            // Ensure MongoDB URL is available
            if (!process.env.MONGODB_URL) {
                throw new Error('MONGODB_URL environment variable is not defined');
            }

            const connectionString = `${process.env.MONGODB_URL}/${DB_NAME}`;
            agendaLogger.info('Creating Agenda instance with standalone connection...');

            // Initialize Agenda with connection string
            // This creates a separate connection using Agenda's internal driver (v4/v5)
            // avoiding conflicts with Mongoose's driver (v6)
            this.agenda = new Agenda({
                db: {
                    address: connectionString,
                    collection: 'agendaJobs',
                    options: {
                        // Driver options if needed
                    }
                },
                processEvery: '5 seconds',
                maxConcurrency: 5,
                defaultConcurrency: 1,
                defaultLockLifetime: 10 * 60 * 1000,
                disableAutoIndex: false, // Let Agenda manage its indexes
            });

            // Setup event listeners
            agendaLogger.info('Setting up event listeners...');
            this.setupEventListeners();

            // Define job processors
            agendaLogger.info('Defining job processors...');
            this.defineJobProcessors();

            // Wait for 'ready' event
            agendaLogger.info('Waiting for Agenda ready event...');
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Agenda ready event timeout after 15 seconds'));
                }, 15000);

                this.agenda!.once('ready', () => {
                    clearTimeout(timeout);
                    agendaLogger.info('✅ Agenda ready event received');
                    resolve();
                });

                this.agenda!.once('error', (error) => {
                    clearTimeout(timeout);
                    agendaLogger.error(error, 'Agenda error during initialization');
                    reject(error);
                });
            });

            // Start processing jobs
            agendaLogger.info('Starting Agenda...');
            await this.agenda.start();
            agendaLogger.info('✅ agenda.start() completed');

            // Add periodic logging
            setInterval(async () => {
                if (this.agenda && this.isInitialized) {
                    try {
                        // Access collection safely
                        const collection = (this.agenda as any)._collection;
                        if (collection) {
                            const now = new Date();
                            const pendingCount = await collection.countDocuments({
                                nextRunAt: { $lte: now },
                                lockedAt: null,
                                disabled: { $ne: true }
                            });
                            const lockedCount = await collection.countDocuments({
                                lockedAt: { $exists: true, $ne: null }
                            });

                            if (pendingCount > 0 || lockedCount > 0) {
                                agendaLogger.info({
                                    pendingJobs: pendingCount,
                                    runningJobs: lockedCount,
                                    processEvery: this.agenda._processEvery
                                }, '📊 Agenda job status check');
                            }
                        }
                    } catch (error: any) {
                        // Silently ignore errors
                    }
                }
            }, 15000);

            this.isInitialized = true;
            agendaLogger.info('✅ Agenda service initialized and started');
        } catch (error) {
            agendaLogger.error(error, '❌ Error during Agenda initialization');
            this.isInitialized = false;
            this.agenda = null;
            throw error;
        }
    }

    /**
     * Setup event listeners for monitoring
     */
    private setupEventListeners(): void {
        if (!this.agenda) {return;}

        this.agenda.on('ready', () => {
            agendaLogger.info('✅ Agenda is ready to process jobs');
            agendaLogger.info({
                processEvery: this.agenda?._processEvery,
                maxConcurrency: this.agenda?._maxConcurrency,
                defaultConcurrency: this.agenda?._defaultConcurrency
            }, 'Agenda configuration');
        });

        this.agenda.on('error', (error) => {
            agendaLogger.error({
                error: error.message || String(error),
                stack: error.stack,
                errorName: error.name,
                errorType: typeof error
            }, '❌ Agenda error');
        });

        // Listen to job-specific start events too
        this.agenda.on('start', async (job) => {
            agendaLogger.info(
                {
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    event: 'start',
                    lockedAt: job.attrs.lockedAt,
                    nextRunAt: job.attrs.nextRunAt
                },
                '🚀 Job START event received'
            );

            // Update status to in-progress when job starts (backup in case job processor hasn't run yet)
            try {
                (job.attrs as any).meta = (job.attrs as any).meta || {};
                if ((job.attrs as any).meta.status === 'pending' || !(job.attrs as any).meta.status) {
                    (job.attrs as any).meta.status = 'in-progress';
                    (job.attrs as any).meta.startedAt = new Date();
                    await job.save();
                }
            } catch (error: any) {
                agendaLogger.warn({ error: error.message, jobId: job.attrs._id }, 'Failed to update status in start event');
            }

            agendaLogger.info(
                {
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    status: (job.attrs as any).meta?.status || 'unknown',
                    data: job.attrs.data
                },
                '🚀 Job started executing'
            );
        });

        // Also listen to job-specific start events (e.g., 'start:send-email')
        this.agenda.on('start:send-email', async (job) => {
            agendaLogger.info({ jobId: job.attrs._id }, '🚀 send-email specific start event');
        });

        // Listen to all job-specific start events for diagnostics
        const jobNames = ['process-data', 'send-email', 'process-image', 'generate-report',
            'cleanup-old-data', 'send-webhook', 'backup-data', 'send-notification',
            'recurring-task', 'process-batch'];
        jobNames.forEach(name => {
            this.agenda.on(`start:${name}`, (job) => {
                agendaLogger.info({ jobId: job.attrs._id, jobName: name }, `🚀 ${name} specific start event`);
            });
        });

        this.agenda.on('success', async (job) => {
            // Update status to completed if not already set (backup in case job processor didn't update it)
            try {
                (job.attrs as any).meta = (job.attrs as any).meta || {};
                if ((job.attrs as any).meta.status === 'in-progress') {
                    (job.attrs as any).meta.status = 'completed';
                    (job.attrs as any).meta.completedAt = new Date();
                    if ((job.attrs as any).meta.startedAt) {
                        (job.attrs as any).meta.durationMs = new Date().getTime() - new Date((job.attrs as any).meta.startedAt).getTime();
                    }
                    await job.save();
                }
            } catch (error: any) {
                agendaLogger.warn({ error: error.message, jobId: job.attrs._id }, 'Failed to update status in success event');
            }

            agendaLogger.info(
                {
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    status: (job.attrs as any).meta?.status || 'completed'
                },
                '✅ Job completed successfully'
            );
        });

        this.agenda.on('fail', async (error, job) => {
            // Update status to error if not already set (backup in case job processor didn't update it)
            try {
                (job.attrs as any).meta = (job.attrs as any).meta || {};
                (job.attrs as any).meta.status = 'error';
                (job.attrs as any).meta.errorAt = new Date();
                (job.attrs as any).meta.errorMessage = error.message || String(error);
                await job.save();
            } catch (saveError: any) {
                agendaLogger.warn({ error: saveError.message, jobId: job.attrs._id }, 'Failed to update status in fail event');
            }

            agendaLogger.error(
                {
                    error: error.message || String(error),
                    errorStack: error.stack,
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    status: 'error',
                    failCount: job.attrs.failCount,
                    lockedAt: job.attrs.lockedAt
                },
                '❌ Job failed'
            );
        });

        // Add 'complete' event listener for additional diagnostics
        this.agenda.on('complete', (job) => {
            agendaLogger.info(
                {
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    lastFinishedAt: job.attrs.lastFinishedAt
                },
                '✅ Job complete event'
            );
        });
    }

    /**
     * Helper to update job status in MongoDB
     */
    private async updateJobStatus(job: any, status: 'pending' | 'in-progress' | 'completed' | 'error', data?: any): Promise<void> {
        (job.attrs as any).meta = (job.attrs as any).meta || {};
        (job.attrs as any).meta.status = status;
        if (data) {
            Object.assign((job.attrs as any).meta, data);
        }
        await job.save();
    }

    /**
     * Define all job processors
     * Each job type has a handler function that runs when the job executes
     */
    private defineJobProcessors(): void {
        if (!this.agenda) {return;}

        agendaLogger.info('Registering job processors...');

        // Log all job names that will be registered
        const jobNames = [
            'process-data', 'send-email', 'process-image', 'generate-report',
            'cleanup-old-data', 'send-webhook', 'backup-data', 'send-notification',
            'recurring-task', 'process-batch'
        ];
        agendaLogger.info({ jobNames }, 'Job processors to register');

        // Job 1: Process data
        this.agenda.define('process-data', async (job) => {
            const startTime = new Date();
            const { data } = job.attrs;

            // Update status to in-progress in MongoDB
            (job.attrs as any).meta = (job.attrs as any).meta || {};
            (job.attrs as any).meta.status = 'in-progress';
            (job.attrs as any).meta.startedAt = startTime;
            await job.save();

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                data
            }, '🚀 Job STARTED: Processing data');

            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                // Update status to completed in MongoDB
                (job.attrs as any).meta.status = 'completed';
                (job.attrs as any).meta.completedAt = endTime;
                (job.attrs as any).meta.durationMs = duration;
                await job.save();

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed'
                }, '✅ Job COMPLETED: Data processing completed');
            } catch (error: any) {
                // Update status to error in MongoDB
                (job.attrs as any).meta.status = 'error';
                (job.attrs as any).meta.errorAt = new Date();
                (job.attrs as any).meta.errorMessage = error.message;
                await job.save();

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Data processing error');
                throw error;
            }
        });

        // Job 2: Send email (with concurrency limit)
        this.agenda.define('send-email', { concurrency: 3 }, async (job) => {
            const startTime = new Date();
            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                message: 'send-email job processor called',
                data: job.attrs.data
            }, '📧 send-email job processor invoked');

            try {
                const { to, subject, body } = job.attrs.data || {};

                // Ensure meta exists and update status to in-progress in MongoDB
                (job.attrs as any).meta = (job.attrs as any).meta || {};
                (job.attrs as any).meta.status = 'in-progress';
                (job.attrs as any).meta.startedAt = startTime;
                try {
                    await job.save();
                    agendaLogger.info({ jobId: job.attrs._id }, 'Status updated to in-progress in MongoDB');
                } catch (error: any) {
                    agendaLogger.warn({ error: error.message, jobId: job.attrs._id }, 'Failed to save status update at job start');
                }

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    scheduledAt: job.attrs.nextRunAt,
                    startedAt: startTime,
                    status: 'in-progress',
                    to,
                    subject
                }, '🚀 Job STARTED: Sending email');

                // Simulate email sending (20% chance of failure for demo)
                if (Math.random() < 0.2) {
                    throw new Error('Email service temporarily unavailable');
                }

                await new Promise(resolve => setTimeout(resolve, 500));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                // Update status to completed in MongoDB
                (job.attrs as any).meta.status = 'completed';
                (job.attrs as any).meta.completedAt = endTime;
                (job.attrs as any).meta.durationMs = duration;
                await job.save();

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed',
                    to
                }, '✅ Job COMPLETED: Email sent');
            } catch (error: any) {
                // Update status to error in MongoDB
                (job.attrs as any).meta = (job.attrs as any).meta || {};
                (job.attrs as any).meta.status = 'error';
                (job.attrs as any).meta.errorAt = new Date();
                (job.attrs as any).meta.errorMessage = error.message;
                try {
                    await job.save();
                } catch (saveError: any) {
                    agendaLogger.warn({ error: saveError.message, jobId: job.attrs._id }, 'Failed to save error status');
                }

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    errorStack: error.stack,
                    startedAt: startTime,
                    status: 'error',
                    failCount: job.attrs.failCount
                }, '❌ Job FAILED: Email sending error');
                throw error;
            }
        });

        // Job 3: Process image
        this.agenda.define('process-image', { concurrency: 2 }, async (job) => {
            const startTime = new Date();
            const { imageUrl, operations } = job.attrs.data;

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                imageUrl,
                operations
            }, '🚀 Job STARTED: Processing image');

            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed',
                    imageUrl
                }, '✅ Job COMPLETED: Image processed');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Image processing error');
                throw error;
            }
        });

        // Job 4: Generate report
        this.agenda.define('generate-report', async (job) => {
            const startTime = new Date();
            const { reportType, dateRange } = job.attrs.data;

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                reportType,
                dateRange
            }, '🚀 Job STARTED: Generating report');

            try {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed',
                    reportType
                }, '✅ Job COMPLETED: Report generated');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Report generation error');
                throw error;
            }
        });

        // Job 5: Cleanup old data
        this.agenda.define('cleanup-old-data', async (job) => {
            const startTime = new Date();
            const { daysOld = 30 } = job.attrs.data || {};

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                daysOld
            }, '🚀 Job STARTED: Running cleanup');

            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed'
                }, '✅ Job COMPLETED: Cleanup completed');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Cleanup error');
                throw error;
            }
        });

        // Job 6: Send webhook
        this.agenda.define('send-webhook', { concurrency: 5 }, async (job) => {
            const startTime = new Date();
            const { url, payload } = job.attrs.data;

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                url
            }, '🚀 Job STARTED: Sending webhook');

            try {
                await new Promise(resolve => setTimeout(resolve, 800));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed',
                    url
                }, '✅ Job COMPLETED: Webhook sent');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Webhook sending error');
                throw error;
            }
        });

        // Job 7: Backup data
        this.agenda.define('backup-data', async (job) => {
            const startTime = new Date();
            const { backupType } = job.attrs.data;

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                backupType
            }, '🚀 Job STARTED: Running backup');

            try {
                await new Promise(resolve => setTimeout(resolve, 5000));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed',
                    backupType
                }, '✅ Job COMPLETED: Backup completed');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Backup error');
                throw error;
            }
        });

        // Job 8: Send notification
        this.agenda.define('send-notification', { concurrency: 10 }, async (job) => {
            const startTime = new Date();
            const { userId, message, priority } = job.attrs.data;

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                userId,
                priority
            }, '🚀 Job STARTED: Sending notification');

            try {
                await new Promise(resolve => setTimeout(resolve, 300));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed',
                    userId
                }, '✅ Job COMPLETED: Notification sent');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Notification sending error');
                throw error;
            }
        });

        // Job 9: Recurring task
        this.agenda.define('recurring-task', async (job) => {
            const startTime = new Date();

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress'
            }, '🚀 Job STARTED: Running recurring task');

            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed'
                }, '✅ Job COMPLETED: Recurring task completed');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Recurring task error');
                throw error;
            }
        });

        // Job 10: Process batch
        this.agenda.define('process-batch', { concurrency: 1 }, async (job) => {
            const startTime = new Date();
            const { batchId, items = [] } = job.attrs.data;

            await this.updateJobStatus(job, 'in-progress', { startedAt: startTime });

            agendaLogger.info({
                jobId: job.attrs._id,
                jobName: job.attrs.name,
                scheduledAt: job.attrs.nextRunAt,
                startedAt: startTime,
                status: 'in-progress',
                batchId,
                itemCount: items.length
            }, '🚀 Job STARTED: Processing batch');

            try {
                for (const item of items) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();

                await this.updateJobStatus(job, 'completed', { completedAt: endTime, durationMs: duration });

                agendaLogger.info({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    startedAt: startTime,
                    completedAt: endTime,
                    durationMs: duration,
                    status: 'completed',
                    batchId
                }, '✅ Job COMPLETED: Batch processed');
            } catch (error: any) {
                await this.updateJobStatus(job, 'error', { errorAt: new Date(), errorMessage: error.message });

                agendaLogger.error({
                    jobId: job.attrs._id,
                    jobName: job.attrs.name,
                    error: error.message,
                    startedAt: startTime,
                    status: 'error'
                }, '❌ Job FAILED: Batch processing error');
                throw error;
            }
        });

        agendaLogger.info({
            processorsRegistered: [
                'process-data', 'send-email', 'process-image', 'generate-report',
                'cleanup-old-data', 'send-webhook', 'backup-data', 'send-notification',
                'recurring-task', 'process-batch'
            ]
        }, '✅ All job processors registered successfully');
    }

    /**
     * Schedule a job to run immediately
     */
    async scheduleJobNow(jobName: string, data: any = {}): Promise<any> {
        this.ensureInitialized();
        const job = await this.agenda!.now(jobName, data);
        agendaLogger.info({ jobId: job.attrs._id, jobName }, 'Job scheduled to run now');
        return job;
    }

    /**
     * Schedule a job for a specific time or relative time
     * @param when - Can be:
     *   - Date object or ISO string for absolute time
     *   - Number (seconds) for relative time (e.g., 30 = run in 30 seconds)
     *   - String like "in 30 seconds", "in 5 minutes", "in 1 hour"
     */
    async scheduleJob(jobName: string, when: Date | string | number, data: any = {}): Promise<any> {
        this.ensureInitialized();

        let scheduleTime: Date | string;

        // Handle relative time
        if (typeof when === 'number') {
            // Number of seconds from now
            scheduleTime = new Date(Date.now() + when * 1000);
            agendaLogger.info({
                jobName,
                secondsFromNow: when,
                scheduledAt: scheduleTime
            }, `Job scheduled to run in ${when} seconds`);
        } else if (typeof when === 'string' && when.startsWith('in ')) {
            // String like "in 30 seconds", "in 5 minutes"
            const match = when.match(/in (\d+) (second|seconds|minute|minutes|hour|hours|day|days)/i);
            if (match) {
                const amount = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                let milliseconds = 0;

                if (unit.startsWith('second')) {
                    milliseconds = amount * 1000;
                } else if (unit.startsWith('minute')) {
                    milliseconds = amount * 60 * 1000;
                } else if (unit.startsWith('hour')) {
                    milliseconds = amount * 60 * 60 * 1000;
                } else if (unit.startsWith('day')) {
                    milliseconds = amount * 24 * 60 * 60 * 1000;
                }

                scheduleTime = new Date(Date.now() + milliseconds);
                agendaLogger.info({
                    jobName,
                    relativeTime: when,
                    scheduledAt: scheduleTime
                }, `Job scheduled: ${when}`);
            } else {
                // Try to parse as ISO date string
                scheduleTime = when;
            }
        } else {
            // Absolute time (Date or ISO string)
            scheduleTime = when;
        }

        const job = await this.agenda!.schedule(scheduleTime, jobName, data);

        // Set initial status to pending
        (job.attrs as any).meta = (job.attrs as any).meta || {};
        (job.attrs as any).meta.status = 'pending';
        (job.attrs as any).meta.createdAt = new Date();
        await job.save();

        // Verify the job definition exists
        // _definitions is an object, not a Map, so we check with 'in' operator
        const definitions = (this.agenda as any)._definitions || {};
        const jobDefinitionExists = jobName in definitions;
        const availableDefinitions = Object.keys(definitions);

        agendaLogger.info({
            jobId: job.attrs._id,
            jobName,
            scheduledAt: job.attrs.nextRunAt,
            nextRunAt: job.attrs.nextRunAt,
            currentTime: new Date(),
            status: 'pending',
            jobDefinitionExists,
            availableDefinitions: availableDefinitions.length > 0 ? availableDefinitions : 'none'
        }, 'Job scheduled');

        if (!jobDefinitionExists) {
            agendaLogger.error({
                jobName,
                availableDefinitions
            }, '⚠️ WARNING: Job definition not found! Job will not execute.');
        }

        return job;
    }

    /**
     * Schedule a recurring job
     * @param interval - e.g., '5 minutes', '1 hour', '1 day'
     */
    async scheduleRecurringJob(jobName: string, interval: string, data: any = {}): Promise<any> {
        this.ensureInitialized();
        const job = await this.agenda!.every(interval, jobName, data, {
            skipImmediate: false,
        });
        agendaLogger.info({ jobId: job.attrs._id, jobName, interval }, 'Recurring job scheduled');
        return job;
    }

    /**
     * Get job by ID
     */
    async getJob(jobId: string): Promise<any | null> {
        this.ensureInitialized();
        const jobs = await this.agenda!.jobs({ _id: jobId });
        return jobs[0] || null;
    }

    /**
     * Get all jobs (with optional filter)
     */
    async getJobs(query: any = {}): Promise<any[]> {
        this.ensureInitialized();
        return await this.agenda!.jobs(query);
    }

    /**
     * Get jobs by name
     */
    async getJobsByName(jobName: string): Promise<any[]> {
        return await this.getJobs({ name: jobName });
    }

    /**
     * Get running jobs
     */
    async getRunningJobs(): Promise<any[]> {
        return await this.getJobs({ lockedAt: { $exists: true, $ne: null } });
    }

    /**
     * Get failed jobs
     */
    async getFailedJobs(): Promise<any[]> {
        return await this.getJobs({ failedAt: { $exists: true } });
    }

    /**
     * Cancel a job
     */
    async cancelJob(jobId: string): Promise<boolean> {
        this.ensureInitialized();
        const jobs = await this.agenda!.jobs({ _id: jobId });
        if (jobs.length === 0) {
            throw new Error(`Job not found: ${jobId}`);
        }
        await jobs[0].remove();
        agendaLogger.info({ jobId }, 'Job cancelled');
        return true;
    }

    /**
     * Retry a failed job
     */
    async retryJob(jobId: string): Promise<any> {
        this.ensureInitialized();
        const job = await this.getJob(jobId);
        if (!job) {
            throw new Error(`Job not found: ${jobId}`);
        }
        job.attrs.failedAt = null;
        job.attrs.failCount = 0;
        job.attrs.failReason = undefined;
        await job.save();
        await job.run();
        agendaLogger.info({ jobId }, 'Job retried');
        return job;
    }

    /**
     * Gracefully shutdown agenda
     */
    async shutdown(): Promise<void> {
        if (!this.agenda) {
            return;
        }
        await this.agenda.stop();
        await this.agenda.close();
        this.isInitialized = false;
        agendaLogger.info('Agenda service shut down');
    }

    /**
     * Get agenda instance (for advanced usage)
     */
    getAgenda(): Agenda | null {
        return this.agenda;
    }

    /**
     * Check if agenda is initialized
     */
    isReady(): boolean {
        return this.agenda !== null && this.isInitialized;
    }

    /**
     * Ensure agenda is initialized
     */
    private ensureInitialized(): void {
        if (!this.agenda || !this.isInitialized) {
            throw new Error('Agenda not initialized. Call initialize() first.');
        }
    }
}

export default new AgendaService();
