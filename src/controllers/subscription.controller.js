import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(400, "The channel you are trying to access does not exist");
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId,
    });

    let result;
    let message;

    // Toggle subscription
    if (isSubscribed) {
        // If already subscribed, unsubscribe
        result = await Subscription.findOneAndDelete({
            subscriber: req.user?._id,
            channel: channelId,
        });

        await User.findByIdAndUpdate(req.user?._id, {
            $pull: { subscribeTo: channelId },
        });

        await User.findByIdAndUpdate(channelId, {
            $pull: { subscribers: req.user?._id },
        });

        message = "Successfully unsubscribed from the channel";
    } else {
        // If not subscribed, subscribe
        const subscriber = await User.findById(req.user?._id);
        const subscribedChannel = await User.findById(channelId);

        result = await Subscription.create({
            subscriber,
            channel: subscribedChannel,
        });

        await User.findByIdAndUpdate(req.user?._id, {
            $push: { subscribeTo: channelId },
        });

        await User.findByIdAndUpdate(channelId, {
            $push: { subscribers: req.user?._id },
        });

        message = "Successfully subscribed to the channel";
    }

    if (!result) {
        throw new ApiError(400, "Operation failed");
    }

    return res.status(200).json(new ApiResponse(200, result, message));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    const registeredUser = await User.findById(subscriberId);
    if (!registeredUser || !(registeredUser._id.toString() == req.user._id.toString())) {
        throw new ApiError(400, "subscriber id doesnot exists");
    }


    const user = await Subscription.aggregate([
        {
            $match: {
                channel: registeredUser?._id
            },
        },
        {
            $project: {
                channel: 1,




            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "list pf subscriber found "
        )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const registeredUser = await User.findById(channelId);
    if (!registeredUser || !(registeredUser._id.toString() == req.user._id.toString())) {
        throw new ApiError(400, "channel which u are trying to acces for getting list doesnot exist");
    }

    const user = await Subscription.aggregate([
        {
            $match: {
                subscriber: registeredUser?._id
            }
        },
        {
            $project: {
                subscriber: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "list pf channe i subscribed found "
        )
    );
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};