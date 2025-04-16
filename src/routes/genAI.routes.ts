import express from "express";
import { analyzeMonthlyTransactions, getSmartSuggestions } from "../controllers/genAIController.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT); // All AI routes require authentication

router.route("/analyze-monthly").post(analyzeMonthlyTransactions);
router.route("/smart-suggestions").post(getSmartSuggestions);

export default router; 