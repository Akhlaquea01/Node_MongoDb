// Finance Tracker App
import mongoose, { Schema } from "mongoose";

// Transaction Schema
const TransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true, // Link transaction to a specific user.
        },
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
        transactionType: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true, // Link transaction to a category.
        },
        description: {
            type: String,
            default: "",
        },
        date: {
            type: Date,
            default: Date.now,
        },
        referenceId: {
            type: String,
            default: null,//txnIds from payment gateways
        },
        tags: {
            type: [String],
            default: ['#personal'],
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurringDetails: {
            frequency: {
                type: String,
                enum: ["daily", "weekly", "monthly", "quaterly", "yearly"], // Defines recurrence frequency.
                default: null,
            },
            endDate: {
                type: Date, // Optional end date for the recurring transaction.
                default: null,
            },
            nextOccurrence: {
                type: Date, // Tracks the next occurrence for recurring transactions.
                default: null,
            },
        },
        location: {
            type: [String],
            default: null,
        },
        budgetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Budget", // Links the transaction to a specific budget.
            default: null,
        },
        sharedWith: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]
    },
    { timestamps: true }
);


// Account Schema
const AccountSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        accountType: {
            type: String,
            enum: ["bank", "credit card", "wallet", "cash", "other"],
            required: true,
        },
        accountName: {
            type: String,
            required: true,
        },
        accountNumber: {
            type: String,
            default: null, // Optional for wallets and cash
        },
        currency: {
            type: String,
            required: true,
            default: "INR", // ISO 4217 currency code
        },
        balance: {
            type: Number,
            required: true,
            default: 0,
        },
        foreignDetails: {
            iban: {
                type: String,
                default: null,
            },
            swiftCode: {
                type: String,
                default: null,
            },
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "closed"],
            default: "active",
        },
        initialBalance: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Export Models
export const Account = mongoose.model("Account", AccountSchema);
export const Transaction = mongoose.model("Transaction", TransactionSchema);

// module.exports = { Account, Transaction };
