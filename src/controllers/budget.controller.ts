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

        // Check for overlapping budgets in the same date range
        const overlappingBudget = await Budget.findOne({
            userId,
            categoryId,
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
        let otherBudget = null;
        if (userId != '6792a79a93a45d02c5016fb7') {
            otherBudget = await Budget.find({ userId: new mongoose.Types.ObjectId('6792a79a93a45d02c5016fb7'), name: 'Others' })
                .populate("categoryId", "name");
        }
        // Transform response: remove unwanted fields and handle "Other" category
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
                name: budgetObj.name ?? budgetObj.categoryId.name,
                category: budgetObj.categoryId ? budgetObj.categoryId : otherBudget.categoryId
            };
        });
        if (otherBudget) {
            formattedBudgets.push(otherBudget[0].toObject());
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
        });

        // Group transactions by categoryId
        const categoryTransactions: Record<string, number> = {};
        transactions.forEach(transaction => {
            if (transaction.categoryId) {
                const categoryIdStr = transaction.categoryId.toString();
                if (!categoryTransactions[categoryIdStr]) {
                    categoryTransactions[categoryIdStr] = 0;
                }
                categoryTransactions[categoryIdStr] += transaction.amount;
            }
        });

        // Get all budgets for the user with populated category information
        const budgets = await Budget.find({ userId }).populate('categoryId', 'name');

        // Create a map of categoryId to budget
        const budgetMap: Record<string, any> = {};
        budgets.forEach(budget => {
            budgetMap[budget.categoryId._id.toString()] = budget;
        });

        // Prepare the response
        const budgetSummaries = [];
        let totalBudgets = 0;

        // Process each category that has transactions
        for (const [categoryId, spent] of Object.entries(categoryTransactions)) {
            let budget = budgetMap[categoryId];
            
            // If no budget found for this category, try to find the most appropriate one
            if (!budget) {
                budget = await getMostRecentBudgetForCategory(userId, categoryId, startDate);
                if (budget) {
                    // Populate the category information for the budget
                    await budget.populate('categoryId', 'name');
                }
            }
            
            if (budget) {
                totalBudgets++;
                budgetSummaries.push({
                    _id: budget._id,
                    budgetId: budget._id,
                    categoryId: budget.categoryId._id,
                    categoryName: budget.categoryId.name,
                    budget: budget.amount,
                    spent: spent,
                    remaining: budget.amount - spent
                });
            }
        }

        // Add budgets that don't have transactions yet
        for (const [categoryId, budget] of Object.entries(budgetMap)) {
            // Skip if we already processed this category
            if (categoryTransactions[categoryId]) continue;
            
            // Check if this budget covers the requested period
            const budgetStartDate = new Date(budget.startDate);
            const budgetEndDate = new Date(budget.endDate);
            
            if (budgetStartDate <= endDate && budgetEndDate >= startDate) {
                totalBudgets++;
                budgetSummaries.push({
                    _id: budget._id,
                    budgetId: budget._id,
                    categoryId: budget.categoryId._id,
                    categoryName: budget.categoryId.name,
                    budget: budget.amount,
                    spent: 0,
                    remaining: budget.amount
                });
            }
        }

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