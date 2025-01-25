import { Router } from 'express';
import {
    createAccount, updateAccount, deleteAccount, getAccount, createTransaction, updateTransaction, deleteTransaction, getTransactions
} from "../controllers/bank.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create").post(createAccount);
router.route("/:accountId").put(updateAccount);
router.route("/:accountId").delete(deleteAccount);
router.route("/get").get(getAccount);

router.post("/transaction", createTransaction);  // Create new transaction
router.put("/transaction/:transactionId", updateTransaction);  // Update transaction by ID
router.delete("/transaction/:transactionId", deleteTransaction);  // Delete transaction by ID
router.get("/transaction/:userId", getTransactions);

export default router