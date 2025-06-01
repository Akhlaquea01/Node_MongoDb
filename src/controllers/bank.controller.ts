// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { Account, Transaction } from "../models/bank.model.js";
import { Category } from "../models/category.model.js";
import { findAppropriateBudget, updateBudgetSpent } from "../utils/budgetUtils.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";




const createAccount = asyncHandler(async (req, res) => {
    try {
        const { accountType, accountName, accountNumber, currency, balance, foreignDetails, isDefault, limit } = req.body;
        const userId = req.user._id;

        // Validate credit card limit if account type is credit_card
        if (accountType === "credit_card") {
            if (!limit || limit <= 0) {
                return res.status(400).json(
                    new ApiResponse(400, undefined, "Credit card limit is required and must be greater than 0")
                );
            }
        }

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
            isDefault,
            limit
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
        const userId = req.user._id;

        // Find the account first
        const account = await Account.findOne({ _id: accountId, userId });

        if (!account) {
            return res.status(404).json(
                new ApiResponse(404, undefined, "Account not found", new Error("Account not found"))
            );
        }
        // Instead of deleting, mark as inactive and deleted
        const updatedAccount = await Account.findByIdAndUpdate(
            accountId,
            {
                status: "inactive"
            },
            { new: true }
        );

        return res.status(200).json(
            new ApiResponse(200, { account: updatedAccount }, "Account marked as deleted successfully")
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
        const { includeInactive } = req.query;

        // Build the query
        const query: any = {
            userId: new mongoose.Types.ObjectId(userId),
            status: 'active'
        };

        // If includeInactive is true, remove the status filter
        if (includeInactive === 'true') {
            delete query.status;
        }

        // Fetch accounts with populated transaction count
        const accounts = await Account.find(query)
            .sort({ isDefault: -1, createdAt: -1 });


        return res.status(200).json(
            new ApiResponse(200, { accounts, totalAccounts: accounts.length }, "Accounts fetched successfully")
        );
    } catch (error) {
        console.error("Error in getAccount:", error);
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

const createTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { accountId, transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith, budgetId, date } = req.body;
        const userId = req.user._id;

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
            budgetId,
            date: date ? new Date(date) : new Date() // Use provided date or current date
        });

        const updatedAccount = await Account.findById(accountId).session(session);

        if (!updatedAccount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(
                new ApiResponse(404, undefined, "Account not found", new Error(`Account not found with accountId:${accountId}`))
            );
        }

        // Calculate new balance
        let newBalance = updatedAccount.balance;

        if (updatedAccount.accountType === "credit_card") {
            // For credit cards, balance represents used amount (debt)
            if (transactionType === "debit") {
                // For debit, check if new balance would exceed limit
                if (newBalance + amount > updatedAccount.limit) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Transaction would exceed credit card limit", new Error(`Transaction would exceed credit card limit: ${accountId}`))
                    );
                }
                newBalance += amount; // Increase balance (debt) for debit
            } else if (transactionType === "credit") {
                // For credit, check if there's enough balance to pay
                if (newBalance < amount) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Insufficient balance to pay", new Error(`Insufficient balance to pay in credit card: ${accountId}`))
                    );
                }
                newBalance -= amount; // Decrease balance (debt) for credit
            }
        } else {
            // For regular accounts
            if (transactionType === "debit") {
                if (newBalance < amount) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in account: ${accountId}`))
                    );
                }
                newBalance -= amount;
            } else if (transactionType === "credit") {
                newBalance += amount;
            }
        }

        // Update the account balance in the database
        const updatedAccountBalance = await Account.findByIdAndUpdate(
            accountId,
            { balance: newBalance },
            { new: true, session }
        );

        await newTransaction.save({ session });

        // Handle budget updates for debit transactions
        if (transactionType === "debit") {
            const budget = await findAppropriateBudget(
                userId,
                categoryId,
                budgetId,
                newTransaction.date,
                session
            );
            if (budget) {
                await updateBudgetSpent(budget, amount, false, session);
            }
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(new ApiResponse(201, { transaction: newTransaction }, "Transaction created successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const createMultipleTransactions = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { transactions } = req.body; // Expecting an array of transactions

        if (!Array.isArray(transactions) || transactions.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiResponse(400, undefined, "Invalid input", new Error("Transaction Array is required"))
            );
        }

        const savedTransactions = [];
        const budgetUpdates = [];

        for (const txn of transactions) {
            const { userId, accountId, transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith, budgetId, date } = txn;

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
                budgetId,
                date: date ? new Date(date) : new Date() // Use provided date or current date
            });

            const updatedAccount = await Account.findById(accountId).session(session);

            if (!updatedAccount) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json(
                    new ApiResponse(404, undefined, "Account not found", new Error(`Account not found with accountId:${accountId}`))
                );
            }

            // Calculate new balance
            let newBalance = updatedAccount.balance;

            if (updatedAccount.accountType === "credit_card") {
                // For credit cards, balance represents used amount (debt)
                if (transactionType === "debit") {
                    // For debit, check if new balance would exceed limit
                    if (newBalance + amount > updatedAccount.limit) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json(
                            new ApiResponse(400, undefined, "Transaction would exceed credit card limit", new Error(`Transaction would exceed credit card limit: ${accountId}`))
                        );
                    }
                    newBalance += amount; // Increase balance (debt) for debit
                } else if (transactionType === "credit") {
                    // For credit, check if there's enough balance to pay
                    if (newBalance < amount) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json(
                            new ApiResponse(400, undefined, "Insufficient balance to pay", new Error(`Insufficient balance to pay in credit card: ${accountId}`))
                        );
                    }
                    newBalance -= amount; // Decrease balance (debt) for credit
                }
            } else {
                // For regular accounts
                if (transactionType === "debit") {
                    if (newBalance < amount) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json(
                            new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in account: ${accountId}`))
                        );
                    }
                    newBalance -= amount;
                } else if (transactionType === "credit") {
                    newBalance += amount;
                }
            }

            // Update the account balance in the database
            const updatedAccountBalance = await Account.findByIdAndUpdate(
                accountId,
                { balance: newBalance },
                { new: true, session }
            );

            await newTransaction.save({ session });
            savedTransactions.push(newTransaction);

            // Handle budget updates for debit transactions
            if (transactionType === "debit") {
                const budget = await findAppropriateBudget(
                    userId,
                    categoryId,
                    budgetId,
                    newTransaction.date,
                    session
                );
                if (budget) {
                    budgetUpdates.push(updateBudgetSpent(budget, amount, false, session));
                }
            }
        }

        // Execute all budget updates in parallel
        await Promise.all(budgetUpdates);

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(new ApiResponse(201, { transactions: savedTransactions }, "Transactions created successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};



const updateTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { transactionId } = req.params;
        const { transactionType, amount, categoryId, description, tags, isRecurring, location, sharedWith, budgetId, date, accountId } = req.body;
        let oldTransaction;
        let updatedTransaction;

        // Find the existing transaction to check the old category and amount
        oldTransaction = await Transaction.findById(transactionId).populate('accountId').session(session);

        if (!oldTransaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiResponse(400, undefined, "Transaction not found", new Error("Transaction with the given ID does not exist"))
            );
        }

        // Get the old account details
        const oldAccount = oldTransaction.accountId;

        // If account is being changed, validate the new account
        let newAccount;
        if (accountId && accountId.toString() !== oldAccount._id.toString()) {
            newAccount = await Account.findById(accountId).session(session);
            if (!newAccount) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json(
                    new ApiResponse(404, undefined, "New account not found", new Error(`Account not found with accountId:${accountId}`))
                );
            }
        }

        // Calculate balance changes
        let oldAccountBalanceChange = 0;
        let newAccountBalanceChange = 0;

        // Handle old transaction reversal
        if (oldAccount.accountType === "credit_card") {
            // For credit cards, balance represents used amount (debt)
            if (oldTransaction.transactionType === "debit") {
                oldAccountBalanceChange -= oldTransaction.amount; // Subtract the old debit (decrease debt)
            } else if (oldTransaction.transactionType === "credit") {
                oldAccountBalanceChange += oldTransaction.amount; // Add back the old credit (increase debt)
            }
        } else {
            // For regular accounts
            if (oldTransaction.transactionType === "debit") {
                oldAccountBalanceChange += oldTransaction.amount; // Add back the old debit
            } else if (oldTransaction.transactionType === "credit") {
                oldAccountBalanceChange -= oldTransaction.amount; // Subtract the old credit
            }
        }

        // Handle new transaction
        if (accountId) {
            // If account is being changed
            if (newAccount.accountType === "credit_card") {
                // For credit cards, balance represents used amount (debt)
                if (transactionType === "debit") {
                    // Check if new balance would exceed limit
                    if (newAccount.balance + amount > newAccount.limit) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json(
                            new ApiResponse(400, undefined, "Transaction would exceed credit card limit", new Error(`Transaction would exceed credit card limit: ${accountId}`))
                        );
                    }
                    newAccountBalanceChange += amount; // Increase balance (debt) for debit
                } else if (transactionType === "credit") {
                    // Check if there's enough balance to pay
                    if (newAccount.balance < amount) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json(
                            new ApiResponse(400, undefined, "Insufficient balance to pay", new Error(`Insufficient balance to pay in credit card: ${accountId}`))
                        );
                    }
                    newAccountBalanceChange -= amount; // Decrease balance (debt) for credit
                }
            } else {
                // For regular accounts
                if (transactionType === "debit") {
                    newAccountBalanceChange -= amount; // New debit
                } else if (transactionType === "credit") {
                    newAccountBalanceChange += amount; // New credit
                }
            }
        } else {
            // If account is not being changed
            if (oldAccount.accountType === "credit_card") {
                // For credit cards, balance represents used amount (debt)
                if (transactionType === "debit") {
                    // Check if new balance would exceed limit
                    if (oldAccount.balance + amount > oldAccount.limit) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json(
                            new ApiResponse(400, undefined, "Transaction would exceed credit card limit", new Error(`Transaction would exceed credit card limit: ${oldAccount._id}`))
                        );
                    }
                    oldAccountBalanceChange += amount; // Increase balance (debt) for debit
                } else if (transactionType === "credit") {
                    // Check if there's enough balance to pay
                    if (oldAccount.balance < amount) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json(
                            new ApiResponse(400, undefined, "Insufficient balance to pay", new Error(`Insufficient balance to pay in credit card: ${oldAccount._id}`))
                        );
                    }
                    oldAccountBalanceChange -= amount; // Decrease balance (debt) for credit
                }
            } else {
                // For regular accounts
                if (transactionType === "debit") {
                    oldAccountBalanceChange -= amount; // Updated debit in same account
                } else if (transactionType === "credit") {
                    oldAccountBalanceChange += amount; // Updated credit in same account
                }
            }
        }

        // Update account balances
        if (oldAccountBalanceChange !== 0) {
            const newOldAccountBalance = oldAccount.balance + oldAccountBalanceChange;
            if (oldAccount.accountType === "credit_card") {
                // For credit cards, check if new balance would exceed limit
                if (newOldAccountBalance > oldAccount.limit) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Transaction would exceed credit card limit", new Error(`Transaction would exceed credit card limit: ${oldAccount._id}`))
                    );
                }
            } else {
                // For regular accounts, check if balance would go negative
                if (newOldAccountBalance < 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in account: ${oldAccount._id}`))
                    );
                }
            }
            await Account.findByIdAndUpdate(
                oldAccount._id,
                { balance: newOldAccountBalance },
                { new: true, session }
            );
        }

        if (newAccount && newAccountBalanceChange !== 0) {
            const newAccountBalance = newAccount.balance + newAccountBalanceChange;
            if (newAccount.accountType === "credit_card") {
                // For credit cards, check if new balance would exceed limit
                if (newAccountBalance > newAccount.limit) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Transaction would exceed credit card limit", new Error(`Transaction would exceed credit card limit: ${newAccount._id}`))
                    );
                }
            } else {
                // For regular accounts, check if balance would go negative
                if (newAccountBalance < 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json(
                        new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in account: ${newAccount._id}`))
                    );
                }
            }
            await Account.findByIdAndUpdate(
                newAccount._id,
                { balance: newAccountBalance },
                { new: true, session }
            );
        }

        // Update the transaction
        updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            {
                transactionType: transactionType || oldTransaction.transactionType,
                amount: amount || oldTransaction.amount,
                categoryId: categoryId || oldTransaction.categoryId,
                description: description || oldTransaction.description,
                tags: tags || oldTransaction.tags,
                date: date ? new Date(date) : new Date(oldTransaction.date),
                isRecurring: isRecurring !== undefined ? isRecurring : oldTransaction.isRecurring,
                location: location || oldTransaction.location,
                sharedWith: sharedWith || oldTransaction.sharedWith,
                budgetId: budgetId || oldTransaction.budgetId,
                accountId: accountId || oldTransaction.accountId
            },
            { new: true, session }
        );

        // Handle budget updates
        if (oldTransaction.transactionType === "debit" || transactionType === "debit") {
            // If the old transaction was a debit, subtract its amount from the old budget
            if (oldTransaction.transactionType === "debit") {
                const oldBudget = await findAppropriateBudget(
                    oldTransaction.userId,
                    oldTransaction.categoryId,
                    oldTransaction.budgetId,
                    oldTransaction.date,
                    session
                );
                if (oldBudget) {
                    await updateBudgetSpent(oldBudget, oldTransaction.amount, true, session);
                }
            }

            // If the new transaction is a debit, add its amount to the new budget
            if (transactionType === "debit") {
                const newBudget = await findAppropriateBudget(
                    oldTransaction.userId,
                    categoryId || oldTransaction.categoryId,
                    budgetId || oldTransaction.budgetId,
                    updatedTransaction.date,
                    session
                );
                if (newBudget) {
                    await updateBudgetSpent(newBudget, amount || oldTransaction.amount, false, session);
                }
            }
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json(new ApiResponse(200, { transaction: updatedTransaction }, "Transaction updated successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
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
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
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

        // Get the Others category once for all transactions
        const othersCategory = await Category.findOne({ name: 'Others', isDefault: true });

        // Transform the transactions to rename categoryId to category and accountId to account
        const transformedTransactions = transactions.map(transaction => {
            const transactionObj = transaction.toObject();
            // Handle null or missing category
            if (!transactionObj.categoryId) {
                transactionObj.category = othersCategory?.toObject() || {
                    name: 'Others',
                    color: '#808080'
                };
            } else {
                transactionObj.category = transactionObj.categoryId;
            }
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

        // Get transactions for the current period with populated category and account information
        const transactions = await Transaction.find({
            userId,
            date: { $gte: queryStartDate, $lte: queryEndDate }
        }).populate('categoryId', 'name')
          .populate('accountId', 'accountName accountType');

        // Get transactions for the previous month to calculate savings
        const prevMonthTransactions = await Transaction.find({
            userId,
            date: { $gte: prevMonthStartDate, $lte: prevMonthEndDate }
        }).populate('accountId', 'accountType');

        // Calculate current period summary
        let totalIncome = 0;
        let totalExpense = 0;
        let categoryWiseExpense = {};
        let categoryWiseIncome = {};
        let creditCardExpenses = 0;
        let creditCardPayments = 0;

        // Process current period transactions
        transactions.forEach(transaction => {
            const isCreditCard = transaction.accountId?.accountType === "credit_card";
            
            if (transaction.transactionType === "credit") {
                totalIncome += transaction.amount;
                if (isCreditCard) {
                    creditCardPayments += transaction.amount;
                }
                if (transaction.categoryId) {
                    const categoryName = transaction.categoryId.name || "Unknown";
                    if (!categoryWiseIncome[categoryName]) {
                        categoryWiseIncome[categoryName] = 0;
                    }
                    categoryWiseIncome[categoryName] += transaction.amount;
                }
            } else if (transaction.transactionType === "debit") {
                totalExpense += transaction.amount;
                if (isCreditCard) {
                    creditCardExpenses += transaction.amount;
                }
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
        let prevMonthCreditCardExpenses = 0;
        let prevMonthCreditCardPayments = 0;

        prevMonthTransactions.forEach(transaction => {
            const isCreditCard = transaction.accountId?.accountType === "credit_card";
            
            if (transaction.transactionType === "credit") {
                prevMonthIncome += transaction.amount;
                if (isCreditCard) {
                    prevMonthCreditCardPayments += transaction.amount;
                }
            } else if (transaction.transactionType === "debit") {
                prevMonthExpense += transaction.amount;
                if (isCreditCard) {
                    prevMonthCreditCardExpenses += transaction.amount;
                }
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
                creditCardExpenses,
                creditCardPayments,
                prevMonthCreditCardExpenses,
                prevMonthCreditCardPayments,
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
    creditCardExpenses: number;
    creditCardPayments: number;
    transactions: Array<{
        id: string;
        type: string;
        amount: number;
        category: string;
        account: string;
        accountType: string;
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
            .populate("accountId", "accountName accountType")
            .sort({ date: 1 });

        if (!transactions.length) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        message: "No transactions found",
                        context: {
                            userId: req.user._id,
                            filters: req.query,
                        },
                    },
                    "No transactions found for the given filters"
                )
            );
        }

        const groupedData: Record<string, GroupedData> = {};

        transactions.forEach((transaction) => {
            let key;
            const transactionDate = new Date(transaction.date);
            const isCreditCard = transaction.accountId?.accountType === "credit_card";

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
                    creditCardExpenses: 0,
                    creditCardPayments: 0,
                    transactions: []
                };
            }

            if (transaction.transactionType === "credit") {
                groupedData[key].income += transaction.amount;
                if (isCreditCard) {
                    groupedData[key].creditCardPayments += transaction.amount;
                }
            } else if (transaction.transactionType === "debit") {
                groupedData[key].expense += transaction.amount;
                if (isCreditCard) {
                    groupedData[key].creditCardExpenses += transaction.amount;
                }
            }

            // Add transaction details to the group
            groupedData[key].transactions.push({
                id: transaction._id,
                type: transaction.transactionType,
                amount: transaction.amount,
                category: transaction.categoryId?.name || "Uncategorized",
                account: transaction.accountId?.accountName || "Unknown",
                accountType: transaction.accountId?.accountType || "Unknown",
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
    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { sourceAccountId, destinationAccountId, amount, description, tags, isBillPayment, categoryId } = req.body;
        const userId = req.user._id;

        // Block negative/zero amounts
        if (!amount || amount <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiResponse(400, undefined, "Amount must be greater than zero", new Error("Invalid transfer amount"))
            );
        }

        // Block same-account transfers
        if (sourceAccountId === destinationAccountId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiResponse(400, undefined, "Cannot transfer to the same account", new Error("Source and destination accounts must be different"))
            );
        }

        // Validate accounts exist and belong to the user
        const sourceAccount = await Account.findOne({ _id: sourceAccountId, userId }).session(session);
        const destinationAccount = await Account.findOne({ _id: destinationAccountId, userId }).session(session);

        if (!sourceAccount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(
                new ApiResponse(404, undefined, "Source account not found", new Error(`Source account not found with ID: ${sourceAccountId}`))
            );
        }

        if (!destinationAccount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(
                new ApiResponse(404, undefined, "Destination account not found", new Error(`Destination account not found with ID: ${destinationAccountId}`))
            );
        }

        // Check if source account has sufficient balance/credit
        if (sourceAccount.accountType === "credit_card") {
            // For credit cards, check if there's enough available credit (for cash advance)
            const availableCredit = sourceAccount.limit - sourceAccount.balance;
            if (availableCredit < amount) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json(
                    new ApiResponse(400, undefined, "Insufficient available credit", new Error(`Insufficient available credit in source account: ${sourceAccountId}`))
                );
            }
        } else {
            // For regular accounts, check if there's enough balance
            if (sourceAccount.balance < amount) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json(
                    new ApiResponse(400, undefined, "Insufficient balance", new Error(`Insufficient balance in source account: ${sourceAccountId}`))
                );
            }
        }

        // Determine the category to use
        let transactionCategoryId = categoryId;

        // If no category provided, try to find an appropriate one
        if (!transactionCategoryId) {
            if (isBillPayment) {
                // For bill payments, try to find "Utilities & Bills" category
                const billPaymentCategory = await Category.findOne({ name: "Utilities & Bills", isDefault: true }).session(session);
                if (billPaymentCategory) {
                    transactionCategoryId = billPaymentCategory._id;
                }
            } else {
                // For regular transfers, try to find "Transfer" category or fall back to "Others"
                const transferCategory = await Category.findOne({ name: "Transfer", isDefault: true }).session(session);
                if (transferCategory) {
                    transactionCategoryId = transferCategory._id;
                } else {
                    const defaultCategory = await Category.findOne({ name: "Others", isDefault: true }).session(session);
                    if (defaultCategory) {
                        transactionCategoryId = defaultCategory._id;
                    }
                }
            }
        }

        // If still no category found, return an error
        if (!transactionCategoryId) {
            await session.abortTransaction();
            session.endSession();
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
        let updatedSourceAccount;
        let updatedDestinationAccount;

        // --- Source Account (always debit) ---
        if (sourceAccount.accountType === "credit_card") {
            // For credit cards, increase balance (debt) for debit (cash advance)
            updatedSourceAccount = await Account.findByIdAndUpdate(
                sourceAccountId,
                { balance: sourceAccount.balance + amount },
                { new: true, session }
            );
        } else {
            // For regular accounts, decrease balance for debit
            updatedSourceAccount = await Account.findByIdAndUpdate(
                sourceAccountId,
                { balance: sourceAccount.balance - amount },
                { new: true, session }
            );
        }

        // --- Destination Account (always credit) ---
        if (destinationAccount.accountType === "credit_card") {
            // For credit cards, decrease balance (debt) for credit (payment)
            updatedDestinationAccount = await Account.findByIdAndUpdate(
                destinationAccountId,
                { balance: destinationAccount.balance - amount },
                { new: true, session }
            );
        } else {
            // For regular accounts, increase balance for credit
            updatedDestinationAccount = await Account.findByIdAndUpdate(
                destinationAccountId,
                { balance: destinationAccount.balance + amount },
                { new: true, session }
            );
        }

        // Save both transactions
        await debitTransaction.save({ session });
        await creditTransaction.save({ session });

        // Handle budget updates for bill payments
        if (isBillPayment) {
            const budget = await findAppropriateBudget(
                userId,
                transactionCategoryId,
                null,
                debitTransaction.date,
                session
            );
            if (budget) {
                await updateBudgetSpent(budget, amount, false, session);
            }
        }

        // If everything is successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(
            new ApiResponse(201, {
                debitTransaction,
                creditTransaction,
                sourceAccount: updatedSourceAccount,
                destinationAccount: updatedDestinationAccount
            }, "Money transferred successfully")
        );
    } catch (error) {
        // If any error occurs, abort the transaction
        await session.abortTransaction();
        session.endSession();
        
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

export {
    createAccount, updateAccount, deleteAccount, getAccount, createTransaction, updateTransaction, deleteTransaction, getTransactions, getTransactionSummary, getExpenseByUser, getIncomeByUser, getInvestmentsByUser, createMultipleTransactions, getIncomeExpenseSummary, transferMoney

};
