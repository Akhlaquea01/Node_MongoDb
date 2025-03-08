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
    const { commentId } = req.params;
    const { newcomment, formattedContent } = req.body;

    if (!commentId) {
        throw new ApiError(400, "commentId should be provided");
    }

    if (!newcomment) {
        throw new ApiError(400, "New comment content is required");
    }

    const commentFound = await Comment.findById(commentId);
    if (!commentFound) {
        throw new ApiError(400, "Comment not found");
    }

    if (!(commentFound.owner.toString() === req.user?._id.toString())) {
        throw new ApiError(400, "Only the owner can update the comment");
    }

    try {
        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: newcomment,
                    formattedContent: formattedContent
                }
            },
            { new: true }
        );

        if (!updatedComment) {
            throw new ApiError(400, "Error occurred while updating comment");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                updatedComment,
                "Comment updated successfully"
            )
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});


const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const { commentId } = req.params;
    if (!commentId) {
        throw new ApiError(400, "commentid should be there for deletion");
    }

    const commentFound = await Comment.findById(commentId);
    if (!commentFound) {
        throw new ApiError(400, "existed comment not found while deletion");
    }
    if (!(commentFound.owner.toString() === req.user?._id.toString())) {
        throw new ApiError(400, "cannot delete only login user can delete");
    }
    try {

        const deletion = await Comment.findByIdAndDelete(
            commentId,
        );
        if (!deletion) {
            throw new ApiError(400, "Error occured while deletion");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                "comment successfully deleted"
            )
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }


})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};
