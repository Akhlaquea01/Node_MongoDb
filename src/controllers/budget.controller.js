// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { Budget } from "../models/budget.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// Create a Budget
const createBudget = asyncHandler(async (req, res) => {
    try {
        const { userId, name, amount, type, startDate, endDate, categoryId, recurring } = req.body;

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

// Get all Budgets for a User
const getAllBudgets = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Invalid user ID", { message: "Invalid user ID" })
            );
        }

        const budgets = await Budget.find({ userId: new mongoose.Types.ObjectId(userId) });

        if (!budgets.length) {
            return res.status(404).json(new ApiResponse(404, null, "No budgets found"));
        }

        return res.status(200).json(new ApiResponse(200, { budgets }, "Budgets fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const getMonthlyBudgetSummary = async (req, res) => {
    try {
        const { userId } = req.params;
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Month and Year are required", { message: "Month and Year are required" })
            );
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month

        const budgets = await Budget.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $lookup: {
                    from: "transactions",
                    let: { category: "$categoryId" },
                    pipeline: [
                        {
                            $match: {
                                userId: new mongoose.Types.ObjectId(userId),
                                date: { $gte: startDate, $lte: endDate },
                                $expr: { $eq: ["$categoryId", "$$category"] }, // ✅ Match by categoryId
                            },
                        },
                        {
                            $group: {
                                _id: "$categoryId",
                                totalSpent: { $sum: "$amount" },
                            },
                        },
                    ],
                    as: "transactions",
                },
            },
            {
                $project: {
                    categoryId: 1,
                    amount: 1, // Budgeted amount
                    spent: { $ifNull: [{ $arrayElemAt: ["$transactions.totalSpent", 0] }, 0] }, // Transactions total
                    remaining: {
                        $subtract: ["$amount", { $ifNull: [{ $arrayElemAt: ["$transactions.totalSpent", 0] }, 0] }],
                    },
                },
            },
        ]);

        if (!budgets.length) {
            return res.status(404).json(new ApiResponse(404, null, "No budgets found for the given month"));
        }

        return res.status(200).json(new ApiResponse(200, { budgets }, "Monthly budget summary fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};



const getYearlyBudgetSummary = async (req, res) => {
    try {
        const { userId } = req.params;
        const { year } = req.query;

        if (!year) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Year is required", { message: "Year is required" })
            );
        }

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const budgets = await Budget.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $lookup: {
                    from: "transactions",
                    let: { category: "$categoryId" },
                    pipeline: [
                        {
                            $match: {
                                userId: new mongoose.Types.ObjectId(userId),
                                date: { $gte: startDate, $lte: endDate },
                                $expr: { $eq: ["$categoryId", "$$category"] }, // ✅ Match transactions by categoryId
                            },
                        },
                        {
                            $group: {
                                _id: "$categoryId",
                                totalSpent: { $sum: "$amount" },
                            },
                        },
                    ],
                    as: "transactions",
                },
            },
            {
                $project: {
                    categoryId: 1,
                    amount: 1, // Budgeted amount
                    spent: { $ifNull: [{ $arrayElemAt: ["$transactions.totalSpent", 0] }, 0] }, // Transactions total
                    remaining: {
                        $subtract: ["$amount", { $ifNull: [{ $arrayElemAt: ["$transactions.totalSpent", 0] }, 0] }],
                    },
                },
            },
        ]);

        if (!budgets.length) {
            return res.status(404).json(new ApiResponse(404, null, "No budgets found for the given year"));
        }

        return res.status(200).json(new ApiResponse(200, { budgets }, "Yearly budget summary fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};



export {
    createBudget, updateBudget, deleteBudget, getAllBudgets, getMonthlyBudgetSummary, getYearlyBudgetSummary

}