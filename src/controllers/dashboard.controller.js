import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            throw new ApiError(400, "User whose playlist we are searching does not exist");
        }

        const obj = {};

        // Get total video views and total videos
        const videoDetails = await User.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "_id",
                    foreignField: "owner",
                    as: "totalvideos"
                }
            },
            {
                $addFields: { totalvideos: { $size: "$totalvideos" } }
            },
            {
                $group: {
                    _id: "$_id",
                    totalvideos: { $first: "$totalvideos" },
                    totalviews: { $sum: "$totalvideos.views" }
                }
            }
        ]);

        if (!videoDetails.length) {
            throw new ApiError(400, "No video details found for the user");
        }

        obj["videoDetails"] = videoDetails[0];

        // Get total likes for videos, comments, and tweets
        const likesDetails = {};

        const getLikesDetails = async (model, matchField, asField) => {
            const result = await model.aggregate([
                {
                    $match: { [matchField]: new mongoose.Types.ObjectId(userId) }
                },
                {
                    $lookup: {
                        from: "likes",
                        localField: "_id",
                        foreignField: asField,
                        as: "likes"
                    }
                },
                {
                    $unwind: "$likes"
                },
                {
                    $group: { _id: "$likes._id" }
                },
                {
                    $count: "totalLikes"
                }
            ]);

            likesDetails[asField] = result && result.length ? result[0].totalLikes : 0;
        };

        await Promise.all([
            getLikesDetails(Video, "owner", "video"),
            getLikesDetails(Comment, "owner", "comment"),
            getLikesDetails(Tweet, "owner", "tweet")
        ]);

        obj["videoLikes"] = likesDetails.video || 0;
        obj["commentLikes"] = likesDetails.comment || 0;
        obj["tweetLikes"] = likesDetails.tweet || 0;

        return res.json(new ApiResponse(200, obj));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});


const getChannelVideos = asyncHandler(async (req, res) => {
    try {
        // Get all the videos uploaded by the channel
        const videos = await Video.find({ owner: req.user?._id });

        if (!videos || videos.length === 0) {
            return res.status(200).json(new ApiResponse(200, "No videos published yet"));
        }

        return res.status(200).json(new ApiResponse(200, videos, "Published videos"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});


export {
    getChannelStats,
    getChannelVideos
};