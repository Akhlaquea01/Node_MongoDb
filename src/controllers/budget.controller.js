// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Budget } from "../models/budget.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// Create a Budget
const createBudget = async (req, res) => {
    try {
        const { userId, name, amount, type, startDate, endDate, categoryId } = req.body;

        const newBudget = new Budget({
            userId,
            name,
            amount,
            type,
            startDate,
            endDate,
            categoryId
        });

        await newBudget.save();
        return res.status(201).json(new ApiResponse(200, { budget: newBudget }, "Budget created successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error creating budget", error.message));
    }
};

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
        return res.status(500).json(new ApiError(500, "Error updating budget", error.message));
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
        return res.status(500).json(new ApiError(500, "Error deleting budget", error.message));
    }
};

// Get all Budgets for a User
const getAllBudgets = async (req, res) => {
    try {
        const { userId } = req.params;

        const budgets = await Budget.find({ userId });

        if (!budgets.length) {
            return res.status(404).json(new ApiResponse(404, null, "No budgets found"));
        }

        return res.status(200).json(new ApiResponse(200, { budgets }, "Budgets fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error fetching budgets", error.message));
    }
};

export {
    createBudget, updateBudget, deleteBudget, getAllBudgets

}