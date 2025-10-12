import { Router } from 'express';
import {
    getStreamingStatus,
    startLiveStreaming,
    stopLiveStreaming,
    getHLSPlayer
} from "../controllers/streaming.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.get("/player", getHLSPlayer);
router.get("/status", getStreamingStatus);

// Protected routes (authentication required)
router.use(verifyJWT);
router.post("/start", startLiveStreaming);
router.post("/stop", stopLiveStreaming);

export default router;
