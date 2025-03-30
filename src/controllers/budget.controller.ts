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
                new ApiResponse(400, undefined, "Invalid user ID", new Error("Invalid user ID"))
            );
        }

        const budgets = await Budget.find({ userId: new mongoose.Types.ObjectId(userId) })
            .populate("categoryId", "name");

        if (!budgets.length) {
            return res.status(204).json(new ApiResponse(204, null, "No budgets found"));
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
                category: budgetObj.categoryId ? budgetObj.categoryId : { _id: "679503070a5043480a8a9a26", name: "Others" }
            };
        });

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

        // Default to current month and year if not provided
        const currentDate = new Date();
        month = month ? parseInt(month) : currentDate.getMonth() + 1;
        year = year ? parseInt(year) : currentDate.getFullYear();

        const startDate = new Date(year, month - 1, 1, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const budgets = await Budget.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) },
            },
            {
                $lookup: {
                    from: "transactions",
                    let: { budgetId: "$_id", category: "$categoryId" },
                    pipeline: [
                        {
                            $match: {
                                userId: new mongoose.Types.ObjectId(userId),
                                date: { $gte: startDate, $lte: endDate },
                                $expr: {
                                    $or: [
                                        { $eq: ["$budgetId", "$$budgetId"] }, // Match by budgetId
                                        { $eq: ["$categoryId", "$$category"] }, // Fallback to categoryId
                                    ],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: "$budgetId", // Group by budgetId
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
                    _id: "$_id", // Ensure correct budgetId in response
                    budgetId: "$_id",
                    categoryId: 1,
                    categoryName: { $ifNull: ["$categoryDetails.name", "Others"] },
                    monthlyBudget: "$amount",
                    spent: {
                        $ifNull: [{ $arrayElemAt: ["$transactions.totalSpent", 0] }, 0],
                    },
                },
            },
            {
                $addFields: {
                    remaining: { $subtract: ["$monthlyBudget", "$spent"] },
                },
            },
        ]);

        if (!budgets.length) {
            return res.status(404).json(new ApiResponse(404, null, `No budgets found for ${month}/${year}`));
        }

        return res.status(200).json(new ApiResponse(200, { month, year, budgets }, "Monthly budget summary fetched successfully"));
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

        const startDate = new Date(year, 0, 1, 0, 0, 0); // First day of the year
        const endDate = new Date(year, 11, 31, 23, 59, 59); // Last day of the year

        // Fetch all transactions for the given year
        const transactions = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: "$categoryId",
                    totalSpent: { $sum: "$amount" },
                },
            },
        ]);

        // Fetch budgets
        const budgets = await Budget.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) },
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
                    categoryName: { $ifNull: ["$categoryDetails.name", "Other"] },
                    monthlyBudget: "$amount",
                    annualBudget: { $multiply: ["$amount", 12] }, // Calculate yearly budget
                },
            },
        ]);

        // Map transactions to their respective categories
        const categorySpendingMap = transactions.reduce((acc, txn) => {
            const categoryId = txn._id ? txn._id.toString() : "Other";
            acc[categoryId] = txn.totalSpent;
            return acc;
        }, {});

        // Final budget summary calculation
        const yearlyBudgetSummary = budgets.map(budget => {
            const categoryId = budget.categoryId ? budget.categoryId.toString() : "Other";
            const spent = categorySpendingMap[categoryId] || 0;
            return {
                categoryId: budget.categoryId,
                categoryName: budget.categoryName,
                annualBudget: budget.annualBudget,
                spent,
                remaining: budget.annualBudget - spent,
            };
        });

        // Handle transactions without a category (Others)
        if (categorySpendingMap["Other"]) {
            yearlyBudgetSummary.push({
                categoryId: null,
                categoryName: "Other",
                annualBudget: 0,
                spent: categorySpendingMap["Other"],
                remaining: -categorySpendingMap["Other"],
            });
        }

        if (!yearlyBudgetSummary.length) {
            return res.status(404).json(new ApiResponse(404, null, `No budgets found for the year ${year}`));
        }

        return res.status(200).json(new ApiResponse(200, { year, budgets: yearlyBudgetSummary }, "Yearly budget summary fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, undefined, "Something went wrong", error));
    }
};







export {
    createBudget, updateBudget, deleteBudget, getAllBudgets, getMonthlyBudgetSummary, getYearlyBudgetSummary

}