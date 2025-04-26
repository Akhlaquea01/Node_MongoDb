// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { Budget } from "../models/budget.model.js";
import { Transaction } from "../models/bank.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// Create a Budget
const createBudget = asyncHandler(async (req, res) => {
    try {
        const { userId, name, amount, type, startDate, endDate, categoryId, recurring } = req.body;

        // Required fields for validation
        const requiredFields = { userId, name, amount, startDate, endDate, recurring };

        // Check if any required field is missing or invalid
        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        // Validate ObjectIds separately
        const invalidIds = [userId, categoryId].filter(id => id && !mongoose.Types.ObjectId.isValid(id));

        if (missingFields.length || invalidIds.length) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Invalid request", new Error(`Missing fields: ${missingFields.join(", ") || "None"}, Invalid IDs: ${invalidIds.join(", ") || "None"}`))
            );
        }

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Invalid date range", new Error("Start date must be before end date"))
            );
        }

        // First check for duplicate name in any time period for the same user
        const duplicateNameBudget = await Budget.findOne({
            userId,
            name,
            $and: [
                { startDate: { $lte: end } },
                { endDate: { $gte: start } }
            ]
        });

        if (duplicateNameBudget) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Duplicate budget name", 
                    new Error(`A budget with name "${name}" already exists for the specified date range. Please use a different name or choose different dates.`))
            );
        }

        // Then check for overlapping active budget with same category
        const existingActiveBudget = await Budget.findOne({
            userId,
            categoryId,
            endDate: { $gte: new Date() }, // Check if budget is still active
            $and: [
                { startDate: { $lte: end } },
                { endDate: { $gte: start } }
            ]
        });

        if (existingActiveBudget) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Active budget exists", 
                    new Error(`An active budget already exists for this category in the specified date range. Please update the existing budget or choose different dates.`))
            );
        }

        const newBudget = new Budget({
            userId,
            name,
            amount,
            type,
            startDate,
            endDate,
            categoryId,
            recurring
        });

        await newBudget.save();
        return res.status(201).json(new ApiResponse(201, { budget: newBudget }, "Budget created successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

// Update a Budget
const updateBudget = async (req, res) => {
    try {
        const { budgetId } = req.params;
        const updatedData = req.body;

        // If date range is being updated, validate it
        if (updatedData.startDate || updatedData.endDate) {
            const currentBudget = await Budget.findById(budgetId);
            if (!currentBudget) {
                return res.status(404).json(new ApiResponse(404, null, "Budget not found"));
            }

            const start = new Date(updatedData.startDate || currentBudget.startDate);
            const end = new Date(updatedData.endDate || currentBudget.endDate);

            if (start >= end) {
                return res.status(400).json(
                    new ApiResponse(400, undefined, "Invalid date range", new Error("Start date must be before end date"))
                );
            }

            // Check for overlapping budgets excluding the current one
            const overlappingBudget = await Budget.findOne({
                _id: { $ne: budgetId },
                userId: currentBudget.userId,
                categoryId: currentBudget.categoryId,
                $or: [
                    {
                        startDate: { $lte: end },
                        endDate: { $gte: start }
                    }
                ]
            });

            if (overlappingBudget) {
                return res.status(400).json(
                    new ApiResponse(400, undefined, "Budget overlap", new Error("A budget already exists for this category in the specified date range"))
                );
            }
        }

        const updatedBudget = await Budget.findByIdAndUpdate(budgetId, updatedData, { new: true });

        if (!updatedBudget) {
            return res.status(404).json(new ApiResponse(404, null, "Budget not found"));
        }

        return res.status(200).json(new ApiResponse(200, { budget: updatedBudget }, "Budget updated successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

// Delete a Budget
const deleteBudget = async (req, res) => {
    try {
        const { budgetId } = req.params;

        const deletedBudget = await Budget.findByIdAndDelete(budgetId);

        if (!deletedBudget) {
            return res.status(404).json(new ApiResponse(404, null, "Budget not found"));
        }

        return res.status(200).json(new ApiResponse(200, null, "Budget deleted successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

// Get all Budgets for a User with Category Name
const getAllBudgets = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Invalid user ID", new Error("Invalid user ID"))
            );
        }

        const budgets = await Budget.find({ userId: new mongoose.Types.ObjectId(userId) })
            .populate("categoryId", "name");

        if (!budgets.length) {
            return res.status(200).json(new ApiResponse(200, { budgets: [], totalBudgetCount: 0 }, "No budgets found"));
        }

        // Get the "Others" budget for the user
        const othersBudget = await Budget.findOne({
            name: 'Others'
        }).populate("categoryId", "name");

        // Transform response: remove unwanted fields and handle null categoryId
        const formattedBudgets = budgets.map(budget => {
            const budgetObj = budget.toObject();
            return {
                _id: budgetObj._id,
                userId: budgetObj.userId,
                amount: budgetObj.amount,
                recurring: budgetObj.recurring,
                createdAt: budgetObj.createdAt,
                startDate: budgetObj.startDate,
                endDate: budgetObj.endDate,
                name: budgetObj.name ?? (budgetObj?.categoryId?.name || 'Others'),
                category: budgetObj.categoryId || (othersBudget?.categoryId || { name: 'Others' })
            };
        });

        // If no "Others" budget exists in the results, add it
        if (othersBudget && !formattedBudgets.some(b => b.name === 'Others')) {
            formattedBudgets.push({
                _id: othersBudget._id,
                userId: othersBudget.userId,
                amount: othersBudget.amount,
                recurring: othersBudget.recurring,
                createdAt: othersBudget.createdAt,
                startDate: othersBudget.startDate,
                endDate: othersBudget.endDate,
                name: 'Others',
                category: othersBudget.categoryId || { name: 'Others' }
            });
        }

        const result = {
            budgets: formattedBudgets,
            totalBudgetCount: formattedBudgets.length
        };
        return res.status(200).json(new ApiResponse(200, result, "Budgets fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

// Helper function to get the most recent budget for a category
const getMostRecentBudgetForCategory = async (userId, categoryId, date) => {
    // First try to find a budget that covers the date
    let budget = await Budget.findOne({
        userId,
        categoryId,
        startDate: { $lte: date },
        endDate: { $gte: date }
    }).populate('categoryId', 'name');

    // If no budget covers the date, find the most recent one before the date
    if (!budget) {
        budget = await Budget.findOne({
            userId,
            categoryId,
            endDate: { $lt: date }
        }).sort({ endDate: -1 }).populate('categoryId', 'name');
    }

    // If still no budget, find the earliest one after the date
    if (!budget) {
        budget = await Budget.findOne({
            userId,
            categoryId,
            startDate: { $gt: date }
        }).sort({ startDate: 1 }).populate('categoryId', 'name');
    }

    return budget;
};

const getBudgetSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const { period, month, year } = req.query;

        // Validate period parameter
        if (!['monthly', 'yearly'].includes(period)) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Invalid period", new Error("Period must be either 'monthly' or 'yearly'"))
            );
        }

        // Parse dates based on period
        const currentDate = new Date();
        let startDate, endDate;

        if (period === 'monthly') {
            // For monthly summary
            const queryMonth = month ? parseInt(month, 10) - 1 : currentDate.getMonth();
            const queryYear = year ? parseInt(year, 10) : currentDate.getFullYear();
            startDate = new Date(queryYear, queryMonth, 1);
            endDate = new Date(queryYear, queryMonth + 1, 0);
        } else {
            // For yearly summary
            const queryYear = year ? parseInt(year, 10) : currentDate.getFullYear();
            startDate = new Date(queryYear, 0, 1);
            endDate = new Date(queryYear, 11, 31);
        }

        // Get all transactions for the period
        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate },
            transactionType: "debit" // Only consider debit transactions for budget tracking
        }).populate('categoryId', 'name color');

        // Get all budgets for the user with populated category information
        const budgets = await Budget.find({ userId }).populate('categoryId', 'name color');

        // Create a map of categoryId to budget
        const budgetMap = {};
        budgets.forEach(budget => {
            if (budget.categoryId) {
                budgetMap[budget.categoryId._id.toString()] = budget;
            }
        });

        // Find Others budget
        const othersBudget = budgets.find(b => b.name === 'Others');

        // Group transactions by categoryId
        const categorySpent = {};
        let othersTotal = 0;
        
        transactions.forEach(transaction => {
            const categoryId = transaction.categoryId?._id?.toString();
            if (categoryId && budgetMap[categoryId]) {
                // Transaction has a matching budget category
                if (!categorySpent[categoryId]) {
                    categorySpent[categoryId] = 0;
                }
                categorySpent[categoryId] += transaction.amount;
            } else {
                // No matching budget category, add to Others
                othersTotal += transaction.amount;
            }
        });

        // Prepare budget summaries
        const budgetSummaries = [];
        let totalBudgets = 0;

        // First, process transactions with matching budgets
        for (const [categoryId, spent] of Object.entries(categorySpent)) {
            const budget = budgetMap[categoryId];
            if (budget) {
                totalBudgets++;
                budgetSummaries.push({
                    _id: budget._id,
                    budgetId: budget._id,
                    categoryId: budget.categoryId._id,
                    categoryName: budget.categoryId.name,
                    categoryColor: budget.categoryId.color,
                    budget: Number(budget.amount),
                    spent: Number(spent),
                    remaining: Number(budget.amount) - Number(spent)
                });
            }
        }

        // Add Others budget if it exists and there are uncategorized transactions
        if (othersBudget && (othersTotal > 0 || !budgetSummaries.some(b => b._id.toString() === othersBudget._id.toString()))) {
            totalBudgets++;
            budgetSummaries.push({
                _id: othersBudget._id,
                budgetId: othersBudget._id,
                categoryId: othersBudget.categoryId?._id || null,
                categoryName: 'Others',
                categoryColor: othersBudget.categoryId?.color || '#808080',
                budget: Number(othersBudget.amount),
                spent: Number(othersTotal),
                remaining: Number(othersBudget.amount) - Number(othersTotal)
            });
        }

        // Add remaining budgets that don't have any transactions
        budgets.forEach(budget => {
            if (budget.name !== 'Others') {  // Skip Others budget as it's already handled
                const budgetId = budget._id.toString();
                if (!budgetSummaries.some(summary => summary._id.toString() === budgetId)) {
                    totalBudgets++;
                    budgetSummaries.push({
                        _id: budget._id,
                        budgetId: budget._id,
                        categoryId: budget.categoryId?._id || null,
                        categoryName: budget.categoryId?.name || budget.name,
                        categoryColor: budget.categoryId?.color || '#808080',
                        budget: Number(budget.amount),
                        spent: 0,
                        remaining: Number(budget.amount)
                    });
                }
            }
        });

        // Prepare response based on period
        const response = period === 'monthly' 
            ? {
                month: startDate.getMonth() + 1,
                year: startDate.getFullYear(),
                totalBudgets,
                budgets: budgetSummaries
            }
            : {
                year: startDate.getFullYear(),
                totalBudgets,
                budgets: budgetSummaries
            };

        return res.status(200).json(
            new ApiResponse(200, response, `${period} budget summary fetched successfully`)
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

export {
    createBudget, updateBudget, deleteBudget, getAllBudgets, getBudgetSummary
}