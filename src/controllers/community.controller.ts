// controllers/communityController
import { Community } from "../models/community.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const createCommunity = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        throw new ApiError(400, "Name and description are required for community creation.");
    }

    const createdCommunity = await Community.create({
        name,
        description,
        owner: req.user._id,
        users: []
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            createdCommunity,
            "Community created successfully"
        )
    );
});

const addUserToCommunity = asyncHandler(async (req, res) => {
    const { userId, communityId } = req.body;

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(communityId)) {
        throw new ApiError(400, "Invalid user ID or community ID");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const community = await Community.findById(communityId);
    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    if (!community.users.includes(userId)) {
        community.users.push(userId);
        await community.save();
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            community,
            "User added to community successfully"
        )
    );
});

const getUserCommunities = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const communities = await Community.find({ users: userId });

    return res.status(200).json(
        new ApiResponse(
            200,
            communities,
            "Communities fetched successfully"
        )
    );
});

const removeUserFromCommunity = asyncHandler(async (req, res) => {
    // Implementation for removing user from community
});

const editCommunity = asyncHandler(async (req, res) => {
    // Implementation for editing community
});

export {
    createCommunity,
    addUserToCommunity,
    removeUserFromCommunity,
    editCommunity,
    getUserCommunities
};
