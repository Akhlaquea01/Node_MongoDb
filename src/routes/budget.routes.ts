// Finance Tracker App
import { Router } from 'express';
import {
    createBudget, updateBudget, deleteBudget, getAllBudgets, getBudgetSummary
} from "../controllers/budget.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create").post(createBudget);
router.route("/:budgetId").put(updateBudget);
router.route("/:budgetId").delete(deleteBudget);
router.route("/getAll").get(getAllBudgets);
router.route("/summary").get(getBudgetSummary);


export default router