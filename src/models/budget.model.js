// Finance Tracker App
import mongoose, { Schema } from "mongoose";
const BudgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        unique: true,
        required: true,
    },
    amount: { type: Number, required: true }, // Budgeted amount
    spent: { type: Number, default: 0 }, // Amount spent so far
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    recurring: {
        type: String,
        enum: ["monthly", "yearly", "none"],
        default: "none",
    },
});

export const Budget = mongoose.model("Budget", BudgetSchema);
