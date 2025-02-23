import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinaryByUrl, getAllImagesFromCloudinary, getAllItemsFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { sendEmail, registrationEmail } from '../utils/email.js';

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const { fullName, email, username, password } = req.body;

    if (
        [fullName, email, username, password].some((field) =>
            field === null || field === undefined || field.trim() === ""
        )
    ) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "All fields are required", {})
        );
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        return res.status(409).json(
            new ApiResponse(409, undefined, "User with email or username already exists", {})
        );
    }

    let avatarLocalPath;
    if (req.files && req.files.avatar && req.files.avatar.length) {
        avatarLocalPath = req?.files?.avatar[0]?.path;
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Avatar file is required", {})
        );
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, 'avatar');
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath, 'coverImage');
    }

    if (!avatar) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Avatar file is required", {})
        );
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong while registering the user", {})
        );
    }

    const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to: 'akhlaquea01@gmail.com',
        subject: 'Hello from Akhlaque',
        html: registrationEmail({ userName: username })
    };

    sendEmail(mailOptions);

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { email, username, password } = req.body;

    if (!username && !email) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "username or email is required", {})
        );
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, undefined, "User does not exist", {})
        );
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        return res.status(401).json(
            new ApiResponse(401, undefined, "Invalid user credentials", {})
        );
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        return res.status(401).json(
            new ApiResponse(401, undefined, "unauthorized request", {})
        );
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            return res.status(401).json(
                new ApiResponse(401, undefined, "Invalid refresh token", {})
            );
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            return res.status(401).json(
                new ApiResponse(401, undefined, "Refresh token is expired or used", {})
            );
        }

        const options = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Invalid old password", {})
        );
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "All fields are required", {})
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }

    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Avatar file is missing", {})
        );
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, 'avatar');

    if (!avatar.url) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Error while uploading on avatar", {})
        );
    }

    const user = await User.findById(req.user?._id).select("-password");

    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, undefined, "User not found", {})
        );
    }

    if (user.avatar) {
        await deleteFromCloudinaryByUrl(user.avatar, 'avatar');
    }

    user.avatar = avatar.url;
    await user.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
        );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Cover image file is missing", {})
        );
    }

    const user = await User.findById(req.user?._id).select("-password");

    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, undefined, "User not found", {})
        );
    }

    if (user.coverImage) {
        await deleteFromCloudinaryByUrl(user.coverImage, 'coverImage');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath, 'coverImage');

    if (!coverImage.url) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Error while uploading cover image", {})
        );
    }

    user.coverImage = coverImage.url;
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
});

const getItemsFromCloudinary = asyncHandler(async (req, res) => {
    try {
        const options = {
            folderName: req.body?.folderName ?? '',
            resourceType: req.body?.resourceType ?? 'image',
            directoryPath: req.body?.directoryPath ?? ''
        };

        const item = await getAllItemsFromCloudinary(options);

        if (item) {
            return res.status(200).json(item);
        } else {
            return res.status(500).json({ message: 'Unable to fetch images from Cloudinary' });
        }
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "username is missing", {})
        );
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        return res.status(404).json(
            new ApiResponse(404, undefined, "channel does not exists", {})
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    getItemsFromCloudinary
};