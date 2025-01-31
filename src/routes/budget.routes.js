// Finance Tracker App
import { Router } from 'express';
import {
    createBudget, updateBudget, deleteBudget, getAllBudgets
} from "../controllers/budget.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create").post(createBudget);
router.route("/:budgetId").put(updateBudget);
router.route("/:budgetId").delete(deleteBudget);
router.route("/get/:userId").get(getAllBudgets);


export default router