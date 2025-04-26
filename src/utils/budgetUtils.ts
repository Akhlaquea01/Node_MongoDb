import { Budget } from "../models/budget.model.js";
import mongoose from "mongoose";

/**
 * Finds the most appropriate budget for a transaction
 * @param userId - The user ID
 * @param categoryId - The category ID
 * @param budgetId - Optional specific budget ID
 * @param date - The transaction date
 * @returns The most appropriate budget or null if none found
 */
export const findAppropriateBudget = async (
    userId: mongoose.Types.ObjectId,
    categoryId: mongoose.Types.ObjectId,
    budgetId?: mongoose.Types.ObjectId,
    date: Date = new Date()
) => {
    let budget = null;

    // Case 1: If budgetId is provided, use that specific budget
    if (budgetId) {
        budget = await Budget.findById(budgetId);
        if (budget) return budget;
    }

    // Case 2: If no budgetId or budget not found, find budget by category
    if (categoryId) {
        // First try to find a budget that covers the date
        budget = await Budget.findOne({
            userId,
            categoryId,
            startDate: { $lte: date },
            endDate: { $gte: date }
        });

        // If no budget covers the date, find the most recent one
        if (!budget) {
            budget = await Budget.findOne({
                userId,
                categoryId
            }).sort({ endDate: -1 });
        }
    }

    // Case 3: If no budget found for the category, use the "Others" budget
    if (!budget) {
        budget = await Budget.findOne({
            userId,
            name: "Others",
            startDate: { $lte: date },
            endDate: { $gte: date }
        });

        // If no active Others budget found, get the most recent Others budget
        if (!budget) {
            budget = await Budget.findOne({
                userId,
                name: "Others"
            }).sort({ endDate: -1 });
        }
    }

    return budget;
};

/**
 * Updates the spent amount in a budget
 * @param budget - The budget to update
 * @param amount - The amount to add/subtract
 * @param isSubtract - Whether to subtract the amount (true) or add it (false)
 */
export const updateBudgetSpent = async (
    budget: any,
    amount: number,
    isSubtract: boolean = false
) => {
    if (budget) {
        budget.spent += isSubtract ? -amount : amount;
        await budget.save();
    }
}; 