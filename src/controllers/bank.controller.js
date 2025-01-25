import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Account } from "../models/bank.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";
// import mongoose from "mongoose";


const createAccount = asyncHandler(async (req, res) => {
    try {
        const { userId, accountType, accountName, accountNumber, currency, balance, foreignDetails, isDefault } = req.body;

        // Check if the account is being set as default and unset other default accounts for the user
        if (isDefault) {
            await Account.updateMany({ userId, isDefault: true }, { isDefault: false });
        }

        const account = new Account({
            userId,
            accountType,
            accountName,
            accountNumber,
            currency,
            balance,
            foreignDetails,
            isDefault
        });

        await account.save();
        return res.status(201).json(
            new ApiResponse(200, account, "Account created successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});
const updateAccount = asyncHandler(async (req, res) => {
    try {
        const { accountId } = req.params;
        const { accountName, accountType, balance, isDefault, status } = req.body;

        // Check if the account is being set as default and unset other default accounts for the user
        if (isDefault) {
            const account = await Account.findById(accountId);
            if (account) {
                await Account.updateMany({ userId: account.userId, isDefault: true }, { isDefault: false });
            }
        }

        const updatedAccount = await Account.findByIdAndUpdate(
            accountId,
            { accountName, accountType, balance, isDefault, status },
            { new: true }
        );

        if (!updatedAccount) {
            throw new ApiError(400, "Account not found");
        }
        return res.status(201).json(
            new ApiResponse(200, { account: updatedAccount }, "Account updated successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});

const deleteAccount = asyncHandler(async (req, res) => {
    try {
        const { accountId } = req.params;

        const deletedAccount = await Account.findByIdAndDelete(accountId);

        if (!deletedAccount) {
            throw new ApiError(404, "Account not found");
        }
        return res.status(201).json(
            new ApiResponse(200, { message: "Account deleted successfully" }, "Account deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});
const getAccount = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.query;

        const accounts = await Account.find({ userId });
        return res.status(201).json(
            new ApiResponse(200, { accounts }, "Account deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});


export {
    createAccount, updateAccount, deleteAccount, getAccount

};