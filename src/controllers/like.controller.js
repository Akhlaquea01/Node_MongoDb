import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    try {
        if (!videoId) {
            throw new ApiError(400, "video ID not found");
        }

        const videoFound = await Video.findById(videoId);
        if (!(videoFound && videoFound.isPublished)) {
            throw new ApiError(400, "video searching for lke not found");
        }

        const userAlreadyLiked = await Like.find({
            video: videoId,
            likedBy: req.user._id
        });
        console.log(userAlreadyLiked);

        if (userAlreadyLiked && userAlreadyLiked.length > 0) {
            await Like.findByIdAndDelete(userAlreadyLiked,
                { new: true });


            return res.status(200).json(
                new ApiResponse(
                    200,
                    "user have already liked a video so video disliked successfully"
                )
            );
        }

        const videoLike = await Like.create({
            likedBy: req.user?._id,
            video: videoId,
        });
        if (!videoLike) {
            throw new ApiError(400, "unable to like a video");
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                videoLike,
                "u have liked this video"
            )
        );
    } catch (error) {
        throw new ApiError(401, error.message || "unable to like and dislike a video");
    }

});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    try {

        if (!commentId) {
            throw new ApiError(400, "commentId  not found");
        }

        const commentFound = await Comment.findById(commentId);
        if (!commentFound) {
            throw new ApiError(400, "comment searching for like not found");
        }

        const userAlreadyLiked = await Like.find({
            comment: commentId,
            likedBy: req.user?._id
        });

        if (userAlreadyLiked && userAlreadyLiked.length > 0) {
            await Like.findByIdAndDelete(userAlreadyLiked, { new: true });

            return res.status(200).json(
                new ApiResponse(
                    200,
                    "user have already liked a comment so comment disliked successfully"
                )
            );
        }

        const commentLike = await Like.create({
            comment: commentId,
            likedBy: req.user?._id,

        });
        if (!commentLike) {
            throw new ApiError(400, "unable to like a comment");
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                commentLike,
                "u have liked this comment"
            )
        );
    } catch (error) {
        throw new ApiError(401, "unable to like and dislike a comment");
    }

});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    //TODO: toggle like on tweet


    try {

        if (!tweetId) {
            throw new ApiError(400, "tweetId  not found");
        }

        const tweetFound = await Tweet.findById(tweetId);
        if (!tweetFound) {
            throw new ApiError(400, "tweet searching for like not found");
        }

        const userAlreadyLiked = await Like.find({
            tweet: tweetId,
            likedBy: req.user?._id
        });

        if (userAlreadyLiked && userAlreadyLiked.length > 0) {
            await Like.findByIdAndDelete(userAlreadyLiked, { new: true });

            return res.status(200).json(
                new ApiResponse(
                    200,
                    "user have already liked a tweet so tweet disliked successfully"
                )
            );
        }

        const tweetLike = await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id,

        });
        if (!tweetLike) {
            throw new ApiError(400, "unable to like a tweet");
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                tweetLike,
                "u have liked this tweet"
            )
        );
    } catch (error) {
        throw new ApiError(401, "unable to like and dislike a tweet");
    }

}
);

const getLikedVideos = asyncHandler(async (req, res) => {
    try {
        const likedVideos = await Like.aggregate([
            {
                $match: {
                    likedBy: new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "likedvideos"
                }
            },
            {
                $unwind: "$likedvideos"
            },
            {
                $project: {
                    likedvideos: 1
                }
            }

        ]);

        if (!likedVideos) {
            return res.json(
                new ApiResponse(
                    200,
                    "user have no liked videos"
                )
            );
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                likedVideos,
                "liked videos fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(401, "cannot get videos" || error.message);
    }


});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
};