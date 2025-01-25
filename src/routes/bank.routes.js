import { Router } from 'express';
import {
    createAccount,
} from "../controllers/bank.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createAccount);
// .get(getAccount)

export default router