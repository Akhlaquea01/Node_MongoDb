import express from "express";
import { generateICS, getSampleConfig } from "../controllers/ics.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(verifyJWT); // All ICS routes require authentication

router.route("/generate").post(generateICS);
router.route("/sample-config").get(getSampleConfig);

export default router; 