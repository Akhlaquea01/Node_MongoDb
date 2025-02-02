import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content, formattedContent } = req.body;

    if (!content) {
        throw new ApiError(400, "content is needed");
    }
    const tweetCreated = await Tweet.create({
        owner: req.user?._id,
        content: content,
        formattedContent: formattedContent ?? ''
    });

    if (!tweetCreated) {
        throw new ApiError(400, "tweet created problem");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            tweetCreated,
            "tweet created successfully"
        )
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "for user tweets id is required");
    }

    const user = await User.findById(userId);
    if (!user || !(user._id.toString() == req.user._id.toString())) {
        throw new ApiError(400, "user doesnot found");
    }

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },

        {
            $project: {
                content: 1,
                formattedContent: 1
            }
        }
    ]);

    if (!userTweets) {
        throw new ApiError(400, "user tweets not existed");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            userTweets,
            "user tweets"
        )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content, formattedContent } = req.body;

    if (!tweetId) {
        throw new ApiError(400, "tweetID doesnot exist");
    }

    if (!content) {
        throw new ApiError(400, "tweetdata doesnot exist");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(400, "tweet not found");
    }

    if (!(tweet.owner.toString() === req.user?._id.toString())) {
        throw new ApiError(400, "user is not logined by smae id");
    }


    try {

        const updatedTweet = await Tweet.findByIdAndUpdate(
            tweetId,
            {
                $set: {
                    content: content,
                    formattedContent: formattedContent
                }
            },
            { new: true }
        );

        if (!updatedTweet) {
            throw new ApiError(400, "probem in updation of tweet");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                updatedTweet,
                "tweet updated successfuully"
            )

        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }


});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, "tweet id not found");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(400, "tweet does not exitsed");
    }

    if (!(tweet.owner.toString() === req.user?._id.toString())) {
        throw new ApiError(400, "user should be loggined with same id");
    }
    try {

        const tweetDeleted = await Tweet.findByIdAndDelete(
            { _id: tweetId },
            { new: true }
        );
        if (!tweetDeleted) {
            throw new ApiError(400, "there is a problem while deleting the tweet");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                "tweet successfully deleted"
            )
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};
