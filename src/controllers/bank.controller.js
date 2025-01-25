import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Account, Transaction } from "../models/bank.model.js";
import { Category } from "../models/category.model.js";

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
        return res.status(201).json(new ApiResponse(200, { transaction: newTransaction }, "Transaction created successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error while creating transaction", error.message));
    }
};

const updateTransaction = async (req, res) => {
    const { transactionId } = req.params;
    const { transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith } = req.body;

    try {
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

        if (!updatedTransaction) {
            return res.status(404).json(new ApiError(404, "Transaction not found", "Transaction with given ID does not exist"));
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
    const { userId } = req.params;

    try {
        const transactions = await Transaction.find({ userId }).populate("accountId categoryId");

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

export {
    createAccount, updateAccount, deleteAccount, getAccount, createTransaction, updateTransaction, deleteTransaction, getTransactions, getTransactionSummary, getRecurringTransactions, addRecurringTransaction, updateRecurringTransaction

};

// getExpenseByUser //getIncomeByUser//getInvestmentsByUser   TODO