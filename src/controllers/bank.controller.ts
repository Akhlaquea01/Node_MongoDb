// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { Account, Transaction } from "../models/bank.model.js";
import { Budget } from "../models/budget.model.js";
import { Category } from "../models/category.model.js";
import { findAppropriateBudget, updateBudgetSpent } from "../utils/budgetUtils.js";

import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const createAccount = asyncHandler(async (req, res) => {
    try {
        const { accountType, accountName, accountNumber, currency, balance, foreignDetails, isDefault } = req.body;
        const userId = req.user._id;

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
            new ApiResponse(201, account, "Account created successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong while creating Account", error)
        );
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
            return res.status(404).json(
                new ApiResponse(404, undefined, "Account not found", new Error(`Account not found with accountId:${accountId}`))
            );
        }
        return res.status(200).json(
            new ApiResponse(200, { account: updatedAccount }, "Account updated successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }

});

const deleteAccount = asyncHandler(async (req, res) => {
    try {
        const { accountId } = req.params;

        const deletedAccount = await Account.findByIdAndDelete(accountId);

        if (!deletedAccount) {
            return res.status(404).json(
                new ApiResponse(404, undefined, "Account not found", new Error("Account not found"))
            );
        }
        return res.status(200).json(
            new ApiResponse(200, { message: "Account deleted successfully" }, "Account deleted successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }

});
const getAccount = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const accounts = await Account.find({ userId });
        return res.status(200).json(
            new ApiResponse(200, { accounts }, "Account fetched successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }

});

const createTransaction = async (req, res) => {
    const { accountId, transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith, budgetId } = req.body;
    const userId = req.user._id;
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
            sharedWith,
            budgetId
        });
        const updatedAccount = await Account.findById(accountId);

        if (!updatedAccount) {
            return res.status(404).json(
                new ApiResponse(404, undefined, "Account not found", new Error(`Account not found with accountId:${accountId}`))
            );
        }

        // Calculate new balance
        let newBalance = updatedAccount.balance;

        if (transactionType === "debit") {
            if (newBalance < amount) {
                return res.status(400).json(
                    new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in account: ${accountId}`))
                );
            }
            newBalance -= amount;
        } else if (transactionType === "credit") {
            newBalance += amount;
        }

        // Update the account balance in the database
        const updatedAccountBalance = await Account.findByIdAndUpdate(
            accountId,
            { balance: newBalance },
            { new: true }
        );

        await newTransaction.save();

        // Handle budget updates for debit transactions
        if (transactionType === "debit") {
            const budget = await findAppropriateBudget(
                userId,
                categoryId,
                budgetId,
                newTransaction.date
            );
            await updateBudgetSpent(budget, amount);
        }

        return res.status(201).json(new ApiResponse(201, { transaction: newTransaction }, "Transaction created successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const createMultipleTransactions = async (req, res) => {
    const { transactions } = req.body; // Expecting an array of transactions

    if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Invalid input", new Error("Transaction Array is required"))
        );
    }

    try {
        const savedTransactions = [];
        const budgetUpdates = [];

        for (const txn of transactions) {
            const { userId, accountId, transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith, budgetId } = txn;

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
                sharedWith,
                budgetId
            });

            const updatedAccount = await Account.findById(accountId);

            if (!updatedAccount) {
                return res.status(404).json(
                    new ApiResponse(404, undefined, "Account not found", new Error(`Account not found with accountId:${accountId}`))
                );
            }

            // Calculate new balance
            let newBalance = updatedAccount.balance;

            if (transactionType === "debit") {
                if (newBalance < amount) {
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in account: ${accountId}`))
                    );
                }
                newBalance -= amount;
            } else if (transactionType === "credit") {
                newBalance += amount;
            }

            // Update the account balance in the database
            const updatedAccountBalance = await Account.findByIdAndUpdate(
                accountId,
                { balance: newBalance },
                { new: true }
            );
            await newTransaction.save();
            savedTransactions.push(newTransaction);

            // Handle budget updates for debit transactions
            if (transactionType === "debit") {
                const budget = await findAppropriateBudget(
                    userId,
                    categoryId,
                    budgetId,
                    newTransaction.date
                );
                if (budget) {
                    budgetUpdates.push(updateBudgetSpent(budget, amount));
                }
            }
        }

        // Execute all budget updates in parallel
        await Promise.all(budgetUpdates);

        return res.status(201).json(new ApiResponse(201, { transactions: savedTransactions }, "Transactions created successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};



const updateTransaction = async (req, res) => {
    const { transactionId } = req.params;
    const { transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith, budgetId } = req.body;
    let oldTransaction;
    let updatedTransaction;

    try {
        // Find the existing transaction to check the old category and amount
        oldTransaction = await Transaction.findById(transactionId);

        if (!oldTransaction) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Transaction not found", new Error("Transaction with the given ID does not exist"))
            );
        }

        // Update the transaction
        updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            {
                transactionType,
                amount,
                categoryId,
                description,
                tags,
                isRecurring,
                location,
                sharedWith,
                budgetId
            },
            { new: true }
        );

        // Handle budget updates
        if (oldTransaction.transactionType === "debit" || transactionType === "debit") {
            // If the old transaction was a debit, subtract its amount from the old budget
            if (oldTransaction.transactionType === "debit") {
                const oldBudget = await findAppropriateBudget(
                    oldTransaction.userId,
                    oldTransaction.categoryId,
                    oldTransaction.budgetId,
                    oldTransaction.date
                );
                await updateBudgetSpent(oldBudget, oldTransaction.amount, true);
            }
            
            // If the new transaction is a debit, add its amount to the new budget
            if (transactionType === "debit") {
                const newBudget = await findAppropriateBudget(
                    oldTransaction.userId,
                    categoryId,
                    budgetId,
                    updatedTransaction.date
                );
                await updateBudgetSpent(newBudget, amount);
            }
        }

        return res.status(200).json(new ApiResponse(200, { transaction: updatedTransaction }, "Transaction updated successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};


const deleteTransaction = async (req, res) => {
    const { transactionId } = req.params;

    try {
        const deletedTransaction = await Transaction.findByIdAndDelete(transactionId);

        if (!deletedTransaction) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Transaction not found", new Error("Transaction with the given ID does not exist"))
            );
        }

        return res.status(200).json(new ApiResponse(200, null, "Transaction deleted successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const getTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate, transactionType, categoryId, accountId, minAmount, maxAmount, tags, isRecurring } = req.query;

        let filter: any = { userId };

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

        const transactions = await Transaction.find(filter).populate("accountId categoryId").sort({ date: -1 });
        
        // Transform the transactions to rename categoryId to category and accountId to account
        const transformedTransactions = transactions.map(transaction => {
            const transactionObj = transaction.toObject();
            transactionObj.category = transactionObj.categoryId;
            transactionObj.account = transactionObj.accountId;
            delete transactionObj.categoryId;
            delete transactionObj.accountId;
            return transactionObj;
        });
        
        const result = {
            transactions: transformedTransactions,
            totalTxn: transactions.length
        }
        return res.status(200).json(new ApiResponse(200, result, "Transactions fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const getTransactionSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const { month, year, startDate, endDate } = req.query;

        // Parse dates based on provided parameters
        let queryStartDate, queryEndDate;
        
        if (month && year) {
            // If month and year are provided, use them to calculate date range
            const queryMonth = parseInt(month, 10) - 1; // Convert to 0-based month
            const queryYear = parseInt(year, 10);
            
            // Set start date to first day of the month
            queryStartDate = new Date(queryYear, queryMonth, 1);
            
            // Set end date to last day of the month
            queryEndDate = new Date(queryYear, queryMonth + 1, 0);
        } else if (startDate && endDate) {
            // If startDate and endDate are provided, use them directly
            queryStartDate = new Date(startDate);
            queryEndDate = new Date(endDate);
        } else {
            // Default to current month if no parameters are provided
            const currentDate = new Date();
            queryStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            queryEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        // Calculate the previous month's date range for savings calculation
        const prevMonthStartDate = new Date(queryStartDate);
        prevMonthStartDate.setMonth(prevMonthStartDate.getMonth() - 1);
        const prevMonthEndDate = new Date(queryStartDate);
        prevMonthEndDate.setDate(prevMonthEndDate.getDate() - 1);

        // Get transactions for the current period with populated category information
        const transactions = await Transaction.find({
            userId,
            date: { $gte: queryStartDate, $lte: queryEndDate }
        }).populate('categoryId', 'name');

        // Get transactions for the previous month to calculate savings
        const prevMonthTransactions = await Transaction.find({
            userId,
            date: { $gte: prevMonthStartDate, $lte: prevMonthEndDate }
        });

        // Calculate current period summary
        let totalIncome = 0;
        let totalExpense = 0;
        let categoryWiseExpense = {};
        let categoryWiseIncome = {};

        // Process current period transactions
        transactions.forEach(transaction => {
            if (transaction.transactionType === "credit") {
                totalIncome += transaction.amount;
                if (transaction.categoryId) {
                    const categoryName = transaction.categoryId.name || "Unknown";
                    if (!categoryWiseIncome[categoryName]) {
                        categoryWiseIncome[categoryName] = 0;
                    }
                    categoryWiseIncome[categoryName] += transaction.amount;
                }
            } else if (transaction.transactionType === "debit") {
                totalExpense += transaction.amount;
                if (transaction.categoryId) {
                    const categoryName = transaction.categoryId.name || "Unknown";
                    if (!categoryWiseExpense[categoryName]) {
                        categoryWiseExpense[categoryName] = 0;
                    }
                    categoryWiseExpense[categoryName] += transaction.amount;
                }
            }
        });

        // Calculate previous month's savings (net amount)
        let prevMonthIncome = 0;
        let prevMonthExpense = 0;
        prevMonthTransactions.forEach(transaction => {
            if (transaction.transactionType === "credit") {
                prevMonthIncome += transaction.amount;
            } else if (transaction.transactionType === "debit") {
                prevMonthExpense += transaction.amount;
            }
        });
        const lastMonthSavings = prevMonthIncome - prevMonthExpense;

        // Format category-wise data for response
        const formattedCategoryWiseExpense = Object.entries(categoryWiseExpense).map(([category, amount]) => ({
            category,
            amount
        }));

        const formattedCategoryWiseIncome = Object.entries(categoryWiseIncome).map(([category, amount]) => ({
            category,
            amount
        }));

        // Calculate net amount (savings) for the current period
        const netAmount = totalIncome - totalExpense;

        // Include month and year in the response for clarity
        const responseMonth = queryStartDate.getMonth() + 1; // Convert back to 1-based month
        const responseYear = queryStartDate.getFullYear();

        return res.status(200).json(
            new ApiResponse(200, {
                month: responseMonth,
                year: responseYear,
                startDate: queryStartDate,
                endDate: queryEndDate,
                totalIncome,
                totalExpense,
                netAmount,
                lastMonthSavings,
                categoryWiseExpense: formattedCategoryWiseExpense,
                categoryWiseIncome: formattedCategoryWiseIncome
            }, "Transaction summary fetched successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const getRecurringTransactions = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch all recurring transactions
        const recurringTransactions = await Transaction.find({ userId, isRecurring: true }).populate('categoryId').exec();

        if (!recurringTransactions || recurringTransactions.length === 0) {
            return res.status(404).json(new ApiResponse(404, null, "No recurring transactions found."));
        }

        return res.status(200).json(new ApiResponse(200, { recurringTransactions }, "Recurring transactions fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
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
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
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
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

// Get Expenses by User
const getExpenseByUser = async (req, res) => {
    try {
        const userId = req.user._id; // Extract userId from request params
        const { startDate, endDate, categoryId } = req.query; // Optional filters for date range and category

        // Build the query
        const query: any = {
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
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};
const getIncomeByUser = async (req, res) => {
    try {
        const userId = req.user._id; // Extract userId from request params
        const { startDate, endDate, categoryId } = req.query; // Optional filters for date range and category

        // Build the query
        const query: any = {
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
            .json(new ApiResponse(200, { expenses }, "Income fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

interface GroupedData {
    date: string;
    income: number;
    expense: number;
    transactions: Array<{
        id: string;
        type: string;
        amount: number;
        category: string;
        account: string;
        date: Date;
        description: string;
    }>;
}

const getIncomeExpenseSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const { filterType, date, month, year } = req.query;

        // Validate filterType
        if (!['daily', 'monthly', 'yearly'].includes(filterType)) {
            return res.status(400).json(new ApiResponse(400, null, "Invalid filter type"));
        }

        let startDate, endDate;

        // Set date range based on filterType
        switch (filterType) {
            case 'daily':
                if (!date) {
                    return res.status(400).json(new ApiResponse(400, null, "Date is required for daily filter"));
                }
                // Parse date in DD/MM/YYYY format
                const [day, parsedMonth, parsedYear] = date.split('/').map(Number);
                startDate = new Date(parsedYear, parsedMonth - 1, day);
                endDate = new Date(parsedYear, parsedMonth - 1, day, 23, 59, 59);
                break;

            case 'monthly':
                if (!month || !year) {
                    return res.status(400).json(new ApiResponse(400, null, "Month and year are required for monthly filter"));
                }
                // For monthly, we need to set the date to the first day of the month at 00:00:00
                startDate = new Date(Number(year), Number(month) - 1, 1);
                // For the end date, we need to set it to the last day of the month at 23:59:59
                endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
                break;

            case 'yearly':
                if (!year) {
                    return res.status(400).json(new ApiResponse(400, null, "Year is required for yearly filter"));
                }
                // For yearly, we need to set the date to January 1st at 00:00:00
                startDate = new Date(Number(year), 0, 1);
                // For the end date, we need to set it to December 31st at 23:59:59
                endDate = new Date(Number(year), 11, 31, 23, 59, 59);
                break;
        }

        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json(new ApiResponse(400, null, "Invalid date format"));
        }

        // Build the query
        const query = {
            userId: new mongoose.Types.ObjectId(userId),
            date: {
                $gte: startDate,
                $lte: endDate,
            },
        };

        // Fetch transactions
        const transactions = await Transaction.find(query)
            .populate("categoryId", "name")
            .populate("accountId", "accountName")
            .sort({ date: 1 });

        if (!transactions.length) {
            return res.status(204).json(new ApiResponse(204, null, "No transactions found"));
        }

        const groupedData: Record<string, GroupedData> = {};

        transactions.forEach((transaction) => {
            let key;
            const transactionDate = new Date(transaction.date);

            if (filterType === "daily") {
                key = transactionDate.toISOString().split("T")[0];
            } else if (filterType === "monthly") {
                // For monthly, use YYYY-MM format
                key = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, '0')}`;
            } else if (filterType === "yearly") {
                // For yearly, just use the year
                key = transactionDate.getFullYear().toString();
            }

            if (!groupedData[key]) {
                groupedData[key] = {
                    date: key,
                    income: 0,
                    expense: 0,
                    transactions: []
                };
            }

            if (transaction.transactionType === "credit") {
                groupedData[key].income += transaction.amount;
            } else if (transaction.transactionType === "debit") {
                groupedData[key].expense += transaction.amount;
            }

            // Add transaction details to the group
            groupedData[key].transactions.push({
                id: transaction._id,
                type: transaction.transactionType,
                amount: transaction.amount,
                category: transaction.categoryId?.name || "Uncategorized",
                account: transaction.accountId?.accountName || "Unknown",
                date: transaction.date,
                description: transaction.description
            });
        });

        // Convert groupedData to array and sort by date
        const result = Object.values(groupedData).sort((a: GroupedData, b: GroupedData) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        return res.status(200).json(new ApiResponse(200, result, "Summary fetched successfully"));
    } catch (error) {
        console.error("Error in getIncomeExpenseSummary:", error);
        return res.status(500).json(new ApiResponse(500, undefined, "Something went wrong", error));
    }
};

const getInvestmentsByUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json(new ApiResponse(400, null, "Invalid user ID"));
        }

        // Build query filters
        const filters: any = {
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
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

/**
 * Transfer money between accounts
 * Creates two transactions: one debit from source account and one credit to destination account
 * Updates account balances accordingly
 * Categorizes the debit transaction as "Utilities & Bills" for budget tracking
 */
const transferMoney = async (req, res) => {
    try {
        const { sourceAccountId, destinationAccountId, amount, description, tags, isBillPayment, categoryId } = req.body;
        const userId = req.user._id;

        // Validate accounts exist and belong to the user
        const sourceAccount = await Account.findOne({ _id: sourceAccountId, userId });
        const destinationAccount = await Account.findOne({ _id: destinationAccountId, userId });

        if (!sourceAccount) {
            return res.status(404).json(
                new ApiResponse(404, undefined, "Source account not found", new Error(`Source account not found with ID: ${sourceAccountId}`))
            );
        }

        if (!destinationAccount) {
            return res.status(404).json(
                new ApiResponse(404, undefined, "Destination account not found", new Error(`Destination account not found with ID: ${destinationAccountId}`))
            );
        }

        // Check if source account has sufficient balance
        if (sourceAccount.balance < amount) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in source account: ${sourceAccountId}`))
            );
        }

        // Determine the category to use
        let transactionCategoryId = categoryId;
        
        // If no category provided, try to find an appropriate one
        if (!transactionCategoryId) {
            if (isBillPayment) {
                // For bill payments, try to find "Utilities & Bills" category
                const billPaymentCategory = await Category.findOne({ name: "Utilities & Bills", type: "predefined" });
                if (billPaymentCategory) {
                    transactionCategoryId = billPaymentCategory._id;
                }
            } else {
                // For regular transfers, try to find "Transfer" category or fall back to "Utilities & Bills"
                const transferCategory = await Category.findOne({ name: "Transfer", type: "predefined" });
                if (transferCategory) {
                    transactionCategoryId = transferCategory._id;
                } else {
                    const defaultCategory = await Category.findOne({ name: "Utilities & Bills", type: "predefined" });
                    if (defaultCategory) {
                        transactionCategoryId = defaultCategory._id;
                    }
                }
            }
        }
        
        // If still no category found, return an error
        if (!transactionCategoryId) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Category required", new Error("No valid category found. Please provide a categoryId in the request."))
            );
        }

        // Create a reference ID to link the two transactions
        const referenceId = new mongoose.Types.ObjectId().toString();

        // Create debit transaction from source account
        const debitTransaction = new Transaction({
            userId,
            accountId: sourceAccountId,
            transactionType: "debit",
            amount,
            categoryId: transactionCategoryId,
            description: description || `Transfer to ${destinationAccount.accountName}`,
            tags: tags || ["transfer", isBillPayment ? "bill-payment" : "internal-transfer"],
            isRecurring: false,
            location: [],
            sharedWith: [],
            referenceId
        });

        // Create credit transaction to destination account
        const creditTransaction = new Transaction({
            userId,
            accountId: destinationAccountId,
            transactionType: "credit",
            amount,
            categoryId: transactionCategoryId,
            description: description || `Transfer from ${sourceAccount.accountName}`,
            tags: tags || ["transfer", isBillPayment ? "bill-payment" : "internal-transfer"],
            isRecurring: false,
            location: [],
            sharedWith: [],
            referenceId
        });

        // Update account balances
        // For source account (always debit)
        const updatedSourceAccount = await Account.findByIdAndUpdate(
            sourceAccountId,
            { balance: sourceAccount.balance - amount },
            { new: true }
        );

        // For destination account (always credit)
        // Special handling for credit card accounts
        let updatedDestinationAccount;
        if (destinationAccount.accountType === "credit card") {
            // For credit cards, a credit transaction reduces the balance (which is typically negative)
            updatedDestinationAccount = await Account.findByIdAndUpdate(
                destinationAccountId,
                { balance: destinationAccount.balance - amount }, // Subtract amount to reduce debt
                { new: true }
            );
        } else {
            // For other account types, a credit transaction increases the balance
            updatedDestinationAccount = await Account.findByIdAndUpdate(
                destinationAccountId,
                { balance: destinationAccount.balance + amount },
                { new: true }
            );
        }

        // Save both transactions
        await debitTransaction.save();
        await creditTransaction.save();

        // Handle budget updates for bill payments
        if (isBillPayment) {
            const budget = await findAppropriateBudget(
                userId,
                transactionCategoryId,
                null,
                debitTransaction.date
            );
            if (budget) {
                await updateBudgetSpent(budget, amount);
            }
        }

        return res.status(201).json(
            new ApiResponse(201, {
                debitTransaction,
                creditTransaction,
                sourceAccount: updatedSourceAccount,
                destinationAccount: updatedDestinationAccount
            }, "Money transferred successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

export {
    createAccount, updateAccount, deleteAccount, getAccount, createTransaction, updateTransaction, deleteTransaction, getTransactions, getTransactionSummary, getRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, getExpenseByUser, getIncomeByUser, getInvestmentsByUser, createMultipleTransactions, getIncomeExpenseSummary, transferMoney

};
