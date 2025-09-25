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
        location: {
            type: [String],
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
            required: true,
            enum: ["bank", "credit_card", "wallet", "cash", "demat", "other"],
        },
        accountName: {
            type: String,
            required: true,
        },
        accountNumber: {
            type: String,
            default: null,
        },
        currency: {
            type: String,
            required: true,
            default: "₹",
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
        limit: {
            type: Number,
            required: function() {
                return this.accountType === "credit_card";
            },
            validate: {
                validator: function(value: number) {
                    return value > 0;
                },
                message: "Credit card limit must be greater than 0"
            }
        },
    },
    { timestamps: true }
);

// Export Models
export const Account = mongoose.model("Account", AccountSchema);
export const Transaction = mongoose.model("Transaction", TransactionSchema);

// module.exports = { Account, Transaction };
