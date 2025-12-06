import { Router } from 'express';
import {
    scheduleJobNow,
    scheduleJob,
    scheduleRecurringJob,
    getJobs,
    getJob,
    cancelJob,
    retryJob,
    getRunningJobs,
    getFailedJobs,
    getJobsByName
} from '../controllers/agenda.controller.js';
import { testAgendaJob, getAgendaStatus } from '../controllers/agenda-test.controller.js';

const router = Router();

router.post('/jobs/now', scheduleJobNow);
router.post('/jobs', scheduleJob);
router.post('/jobs/recurring', scheduleRecurringJob);
router.get('/jobs', getJobs);
router.get('/jobs/running', getRunningJobs);
router.get('/jobs/failed', getFailedJobs);
router.get('/jobs/name/:jobName', getJobsByName);
router.get('/jobs/:jobId', getJob);
router.post('/jobs/:jobId/cancel', cancelJob);
router.post('/jobs/:jobId/retry', retryJob);
router.post('/test', testAgendaJob);
router.get('/status', getAgendaStatus);

export default router;
