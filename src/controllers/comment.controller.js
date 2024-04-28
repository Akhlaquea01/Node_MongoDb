import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    // TODO: get all comments for a video
    const { videoId } = req.params;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page); // Convert page to number
    limit = parseInt(limit); // Convert limit to number

    if (!videoId) {
        throw new ApiError(400, "videoId is required for getvideos");
    }

    const videoFound = await Video.findById(videoId);
    if (!videoFound) {
        throw new ApiError(400, "video does not exist");
    }

    const allCommentsFound = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likedBy"
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ]);

    if (!allCommentsFound || allCommentsFound.length === 0) {
        throw new ApiError(400, "No comments found");
    }

    return res.status(200).json(
        new ApiResponse(200, allCommentsFound, "Comments found")
    );
});


const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { commentData, formattedContent } = req.body;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const videoFound = await Video.findById(videoId);
    if (!videoFound) {
        throw new ApiError(400, "video required for commenting doesnot exist");
    }

    if (!commentData) {
        throw new ApiError(400, "commentData required for commenting doesnot exist");
    }

    const commentCreated = await Comment.create({
        content: commentData,
        formattedContent: formattedContent,
        video: videoFound?._id,
        owner: req.user?._id
    });

    if (!commentCreated) {
        throw new ApiError(400, "there is an eroor while creating comment");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            commentCreated,
            "Comment sucessfullly created"
        )
    );

});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};
