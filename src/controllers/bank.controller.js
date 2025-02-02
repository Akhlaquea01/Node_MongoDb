// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Account, Transaction } from "../models/bank.model.js";
import { Category } from "../models/category.model.js";
import { Budget } from "../models/budget.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const createAccount = asyncHandler(async (req, res) => {
    try {
        const { userId, accountType, accountName, accountNumber, currency, balance, foreignDetails, isDefault } = req.body;

        // Check if the account is being set as default and unset other default accounts for the user
        if (isDefault) {
            await Account.updateMany({ userId, isDefault: true }, { isDefault: false });
        }

        const account = new Account({
            userId,
            accountType,
            accountName,
            accountNumber,
            currency,
            balance,
            foreignDetails,
            isDefault
        });

        await account.save();
        return res.status(201).json(
            new ApiResponse(200, account, "Account created successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});
const updateAccount = asyncHandler(async (req, res) => {
    try {
        const { accountId } = req.params;
        const { accountName, accountType, balance, isDefault, status } = req.body;

        // Check if the account is being set as default and unset other default accounts for the user
        if (isDefault) {
            const account = await Account.findById(accountId);
            if (account) {
                await Account.updateMany({ userId: account.userId, isDefault: true }, { isDefault: false });
            }
        }

        const updatedAccount = await Account.findByIdAndUpdate(
            accountId,
            { accountName, accountType, balance, isDefault, status },
            { new: true }
        );

        if (!updatedAccount) {
            throw new ApiError(400, "Account not found");
        }
        return res.status(201).json(
            new ApiResponse(200, { account: updatedAccount }, "Account updated successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});

const deleteAccount = asyncHandler(async (req, res) => {
    try {
        const { accountId } = req.params;

        const deletedAccount = await Account.findByIdAndDelete(accountId);

        if (!deletedAccount) {
            throw new ApiError(404, "Account not found");
        }
        return res.status(201).json(
            new ApiResponse(200, { message: "Account deleted successfully" }, "Account deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});
const getAccount = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.query;

        const accounts = await Account.find({ userId });
        return res.status(201).json(
            new ApiResponse(200, { accounts }, "Account deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});

const createTransaction = async (req, res) => {
    const { userId, accountId, transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith } = req.body;

    try {
        // Create new transaction
        const newTransaction = new Transaction({
            userId,
            accountId,
            transactionType,
            amount,
            categoryId,
            description,
            tags,
            isRecurring,
            location,
            sharedWith
        });

        await newTransaction.save();

        // Find the corresponding budget for the category in the current date range
        const currentDate = new Date();
        const budget = await Budget.findOne({
            userId,
            categoryId,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        // If a budget exists, update the spent amount
        if (budget) {
            budget.spent += amount;
            await budget.save();
        } else {
            const budget = await Budget.findOne({
                userId,
                categoryId: "679503070a5043480a8a9a26",//other category
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });
            if (budget) {
                budget.spent += amount;
                await budget.save();
            }
        }

        return res.status(201).json(new ApiResponse(200, { transaction: newTransaction }, "Transaction created successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error while creating transaction", error.message));
    }
};

const createMultipleTransactions = async (req, res) => {
    const { transactions } = req.body; // Expecting an array of transactions

    if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json(new ApiError(400, "Invalid input", "Transactions array is required"));
    }

    try {
        const currentDate = new Date();
        const savedTransactions = [];
        const budgetUpdates = [];

        for (const txn of transactions) {
            const { userId, accountId, transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith } = txn;

            // Create new transaction
            const newTransaction = new Transaction({
                userId,
                accountId,
                transactionType,
                amount,
                categoryId,
                description,
                tags,
                isRecurring,
                location,
                sharedWith
            });

            await newTransaction.save();
            savedTransactions.push(newTransaction);

            // Find the corresponding budget for the category in the current date range
            const budget = await Budget.findOne({
                userId,
                categoryId,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });

            // If a budget exists, update the spent amount
            if (budget) {
                budget.spent += amount;
                budgetUpdates.push(budget.save());
            } else {
                const budget = await Budget.findOne({
                    userId,
                    categoryId: "679503070a5043480a8a9a26",//other category
                    startDate: { $lte: currentDate },
                    endDate: { $gte: currentDate }
                });
                if (budget) {
                    budget.spent += amount;
                    budgetUpdates.push(budget.save());
                }
            }
        }

        // Execute all budget updates in parallel
        await Promise.all(budgetUpdates);

        return res.status(201).json(new ApiResponse(201, { transactions: savedTransactions }, "Transactions created successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error while creating transactions", error.message));
    }
};



const updateTransaction = async (req, res) => {
    const { transactionId } = req.params;
    const { transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith } = req.body;

    try {
        // Find the existing transaction to check the old category and amount
        const oldTransaction = await Transaction.findById(transactionId);

        if (!oldTransaction) {
            return res.status(404).json(new ApiError(404, "Transaction not found", "Transaction with the given ID does not exist"));
        }

        // Update the transaction
        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            {
                transactionType,
                amount,
                categoryId,
                description,
                tags,
                isRecurring,
                location,
                sharedWith
            },
            { new: true } // returns the updated transaction
        );

        // If category is changed, update the budgets accordingly
        if (oldTransaction.categoryId.toString() !== categoryId.toString()) {
            // Decrease spent amount in the old category's budget
            const oldBudget = await Budget.findOne({
                userId: updatedTransaction.userId,
                categoryId: oldTransaction.categoryId,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });
            if (oldBudget) {
                oldBudget.spent -= oldTransaction.amount;
                await oldBudget.save();
            }

            // Increase spent amount in the new category's budget
            const newBudget = await Budget.findOne({
                userId: updatedTransaction.userId,
                categoryId,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });
            if (newBudget) {
                newBudget.spent += amount;
                await newBudget.save();
            }
        } else {
            // If category is not changed, just adjust the spent amount based on the amount change
            const budget = await Budget.findOne({
                userId: updatedTransaction.userId,
                categoryId,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });
            if (budget) {
                budget.spent -= oldTransaction.amount; // Subtract old amount
                budget.spent += amount; // Add new amount
                await budget.save();
            }
        }

        return res.status(200).json(new ApiResponse(200, { transaction: updatedTransaction }, "Transaction updated successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error while updating transaction", error.message));
    }
};


const deleteTransaction = async (req, res) => {
    const { transactionId } = req.params;

    try {
        const deletedTransaction = await Transaction.findByIdAndDelete(transactionId);

        if (!deletedTransaction) {
            return res.status(404).json(new ApiError(404, "Transaction not found", "Transaction with given ID does not exist"));
        }

        return res.status(200).json(new ApiResponse(200, null, "Transaction deleted successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error while deleting transaction", error.message));
    }
};

const getTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, transactionType, categoryId, accountId, minAmount, maxAmount, tags, isRecurring } = req.query;

        let filter = { userId };

        // Filter by date range
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Filter by transaction type (credit/debit)
        if (transactionType) {
            filter.transactionType = transactionType;
        }

        // Filter by categoryId
        if (categoryId) {
            filter.categoryId = categoryId;
        }

        // Filter by accountId
        if (accountId) {
            filter.accountId = accountId;
        }

        // Filter by min/max amount
        if (minAmount || maxAmount) {
            filter.amount = {};
            if (minAmount) filter.amount.$gte = parseFloat(minAmount);
            if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
        }

        // Filter by tags (check if any tag matches)
        if (tags) {
            filter.tags = { $in: tags.split(",") }; // Expecting tags as comma-separated values
        }

        // Filter by isRecurring
        if (isRecurring !== undefined) {
            filter.isRecurring = isRecurring === "true";
        }

        const transactions = await Transaction.find(filter).populate("accountId categoryId");

        return res.status(200).json(new ApiResponse(200, { transactions }, "Transactions fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error while fetching transactions", error.message));
    }
};

const getTransactionSummary = async (req, res) => {
    try {
        const { userId } = req.params;

        // Aggregate transactions to calculate total income and expenses
        const summary = await Transaction.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalIncome: {
                        $sum: {
                            $cond: [{ $eq: ["$transactionType", "credit"] }, "$amount", 0]
                        }
                    },
                    totalExpense: {
                        $sum: {
                            $cond: [{ $eq: ["$transactionType", "debit"] }, "$amount", 0]
                        }
                    }
                }
            }
        ]);

        if (!summary) {
            return res.status(404).json(new ApiResponse(404, null, "Transaction summary not found."));
        }

        return res.status(200).json(new ApiResponse(200, { summary }, "Transaction summary fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error fetching transaction summary", error.message));
    }
};

const getRecurringTransactions = async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch all recurring transactions
        const recurringTransactions = await Transaction.find({ userId, isRecurring: true }).populate('categoryId').exec();

        if (!recurringTransactions || recurringTransactions.length === 0) {
            return res.status(404).json(new ApiResponse(404, null, "No recurring transactions found."));
        }

        return res.status(200).json(new ApiResponse(200, { recurringTransactions }, "Recurring transactions fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error fetching recurring transactions", error.message));
    }
};


const addRecurringTransaction = async (req, res) => {
    try {
        const { userId, accountId, transactionType, amount, categoryId, description, interval } = req.body;

        // Create new recurring transaction
        const newRecurringTransaction = new Transaction({
            userId,
            accountId,
            transactionType,
            amount,
            categoryId,
            description,
            isRecurring: true,
            interval, // Recurrence interval (e.g., daily, weekly, monthly)
        });

        await newRecurringTransaction.save();

        return res.status(201).json(new ApiResponse(201, { newRecurringTransaction }, "Recurring transaction added successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error adding recurring transaction", error.message));
    }
};


const updateRecurringTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { amount, categoryId, description, interval } = req.body;

        // Update recurring transaction
        const updatedTransaction = await Transaction.findByIdAndUpdate(transactionId, {
            amount,
            categoryId,
            description,
            interval,
        }, { new: true });

        if (!updatedTransaction) {
            return res.status(404).json(new ApiResponse(404, null, "Recurring transaction not found."));
        }

        return res.status(200).json(new ApiResponse(200, { updatedTransaction }, "Recurring transaction updated successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error updating recurring transaction", error.message));
    }
};

// Get Expenses by User
const getExpenseByUser = async (req, res) => {
    try {
        const { userId } = req.params; // Extract userId from request params
        const { startDate, endDate, categoryId } = req.query; // Optional filters for date range and category

        // Build the query
        const query = {
            userId,
            transactionType: "debit", // Filter only expenses (debits)
        };

        // Apply optional filters
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        if (categoryId) {
            query.categoryId = categoryId; // Filter by category if provided
        }

        // Fetch expenses from the database
        const expenses = await Transaction.find(query)
            .populate("categoryId", "name") // Populate categoryId with category details (e.g., name)
            .populate("accountId", "accountName") // Populate accountId with account details (e.g., accountName)
            .sort({ date: -1 }); // Sort by date (most recent first)

        // Check if expenses exist
        if (!expenses.length) {
            return res.status(404).json(new ApiResponse(404, null, "No expenses found for the user"));
        }

        // Return success response
        return res
            .status(200)
            .json(new ApiResponse(200, { expenses }, "Expenses fetched successfully"));
    } catch (error) {
        // Handle errors
        return res
            .status(500)
            .json(new ApiError(500, "Error fetching expenses", error.message));
    }
};
const getIncomeByUser = async (req, res) => {
    try {
        const { userId } = req.params; // Extract userId from request params
        const { startDate, endDate, categoryId } = req.query; // Optional filters for date range and category

        // Build the query
        const query = {
            userId,
            transactionType: "credit", // Filter only income (credits)
        };

        // Apply optional filters
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        if (categoryId) {
            query.categoryId = categoryId; // Filter by category if provided
        }

        // Fetch expenses from the database
        const expenses = await Transaction.find(query)
            .populate("categoryId", "name") // Populate categoryId with category details (e.g., name)
            .populate("accountId", "accountName") // Populate accountId with account details (e.g., accountName)
            .sort({ date: -1 }); // Sort by date (most recent first)

        // Check if expenses exist
        if (!expenses.length) {
            return res.status(404).json(new ApiResponse(404, null, "No Income found for the user"));
        }

        // Return success response
        return res
            .status(200)
            .json(new ApiResponse(200, { expenses }, "Expenses fetched successfully"));
    } catch (error) {
        // Handle errors
        return res
            .status(500)
            .json(new ApiError(500, "Error fetching expenses", error.message));
    }
};


const getInvestmentsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json(new ApiResponse(400, null, "Invalid user ID"));
        }

        // Build query filters
        const filters = {
            userId: new mongoose.Types.ObjectId(userId),
        };

        if (startDate && endDate) {
            filters.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Fetch transactions and populate category details
        const transactions = await Transaction.find(filters)
            .populate("categoryId", "name") // Populate only the `name` field from Category
            .populate("accountId", "accountName")
            .sort({ date: -1 });

        // Filter transactions for investment categories or those with tags
        const investmentTransactions = transactions.filter((txn) => {
            const isInvestment =
                txn.categoryId?.name?.toLowerCase() === "investment"; // Check for "investment" category
            const hasTags = txn.tags && txn.tags.length > 0; // Check if transaction has tags
            return isInvestment || hasTags; // Include either based on investment category or tags
        });

        if (investmentTransactions.length === 0) {
            return res
                .status(404)
                .json(new ApiResponse(404, null, "No investment or tagged transactions found"));
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                { investments: investmentTransactions },
                "Investment or tagged transactions fetched successfully"
            )
        );
    } catch (error) {
        return res.status(500).json(
            new ApiError(500, "Error fetching investment or tagged transactions", error.message)
        );
    }
};



export {
    createAccount, updateAccount, deleteAccount, getAccount, createTransaction, updateTransaction, deleteTransaction, getTransactions, getTransactionSummary, getRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, getExpenseByUser, getIncomeByUser, getInvestmentsByUser, createMultipleTransactions

};
