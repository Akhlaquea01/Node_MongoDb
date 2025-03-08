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

// Get all Budgets for a User with Category Name
const getAllBudgets = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Invalid user ID", { message: "Invalid user ID" })
            );
        }

        const budgets = await Budget.find({ userId: new mongoose.Types.ObjectId(userId) })
            .populate("categoryId", "name");

        if (!budgets.length) {
            return res.status(204).json(new ApiResponse(204, null, "No budgets found"));
        }

        // Transform response to rename categoryId to category
        const formattedBudgets = budgets.map(budget => ({
            ...budget.toObject(),
            category: budget.categoryId,
            categoryId: undefined // Remove the original categoryId
        }));

        return res.status(200).json(new ApiResponse(200, { budgets: formattedBudgets }, "Budgets fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const getMonthlyBudgetSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        let { month, year } = req.query;

        // Default to the current month and year if not provided
        const currentDate = new Date();
        month = month ? parseInt(month) : currentDate.getMonth() + 1; // Months are 0-based
        year = year ? parseInt(year) : currentDate.getFullYear();

        if (!month || !year) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Month and Year are required", { message: "Month and Year are required" })
            );
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month

        const budgets = await Budget.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) },
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
                                $expr: { $eq: ["$categoryId", "$$category"] },
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
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            {
                $unwind: {
                    path: "$categoryDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    categoryId: 1,
                    categoryName: "$categoryDetails.name",
                    amount: 1,
                    spent: { $ifNull: [{ $arrayElemAt: ["$transactions.totalSpent", 0] }, 0] },
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
        return res.status(500).json(new ApiResponse(500, undefined, "Something went wrong", error));
    }
};




const getYearlyBudgetSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        let { year } = req.query;

        // Default to current year if not provided
        const currentYear = new Date().getFullYear();
        year = year ? parseInt(year) : currentYear;

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const budgets = await Budget.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) },
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
                                $expr: { $eq: ["$categoryId", "$$category"] },
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
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            {
                $unwind: {
                    path: "$categoryDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    categoryId: 1,
                    categoryName: "$categoryDetails.name",
                    amount: 1,
                    spent: { $ifNull: [{ $arrayElemAt: ["$transactions.totalSpent", 0] }, 0] },
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
        return res.status(500).json(new ApiResponse(500, undefined, "Something went wrong", error));
    }
};




export {
    createBudget, updateBudget, deleteBudget, getAllBudgets, getMonthlyBudgetSummary, getYearlyBudgetSummary

}