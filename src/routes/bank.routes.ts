// Finance Tracker App
import { Router } from 'express';
import {
    createAccount, updateAccount, deleteAccount, getAccount, createTransaction, updateTransaction, deleteTransaction, getTransactions, getTransactionSummary, getRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, getExpenseByUser, getIncomeByUser, getInvestmentsByUser, createMultipleTransactions, getIncomeExpenseSummary, transferMoney
} from "../controllers/bank.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create").post(createAccount);
router.route("/:accountId").put(updateAccount);
router.route("/:accountId").delete(deleteAccount);
router.route("/get").get(getAccount);

router.post("/transaction", createTransaction);  // Create new transaction
router.post("/transaction/multitxn", createMultipleTransactions);  // Create new transaction
router.put("/transaction/:transactionId", updateTransaction);  // Update transaction by ID
router.delete("/transaction/:transactionId", deleteTransaction);  // Delete transaction by ID
router.get("/transaction", getTransactions);
router.get("/transaction/summary", getTransactionSummary);
router.get("/transaction/incomeExpenseSummary", getIncomeExpenseSummary);
router.get("/transaction/recurring", getRecurringTransactions);
router.post("/transaction/recurring", addRecurringTransaction);
router.put("/transaction/recurring/:transactionId", updateRecurringTransaction);
router.get("/transaction/expense", getExpenseByUser);
router.get("/transaction/income", getIncomeByUser);
router.get("/transaction/investment", getInvestmentsByUser);
router.post("/transfer", transferMoney);

export default router