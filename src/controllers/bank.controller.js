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


export {
    createAccount,

};