import { Router } from 'express';
import {
    getCronTasksStatus,
    startCronTask,
    stopCronTask,
    resumeCronTask,
    createCustomCronTask,
    initializeAllCronTasks,
    stopAllCronTasks
} from '../controllers/cron.controller.js';

const router = Router();

router.get('/status', getCronTasksStatus);
router.post('/initialize', initializeAllCronTasks);
router.post('/stop-all', stopAllCronTasks);
router.post('/task/:taskId/start', startCronTask);
router.post('/task/:taskId/stop', stopCronTask);
router.post('/task/:taskId/resume', resumeCronTask);
router.post('/custom', createCustomCronTask);

export default router;
