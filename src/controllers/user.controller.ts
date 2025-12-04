import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinaryByUrl, getAllImagesFromCloudinary, getAllItemsFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { sendEmail, registrationEmail } from '../utils/email.js';
import logger from "../utils/logger.js";

const userLogger = logger.child({ module: 'user' });

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        userLogger.debug({ userId: userId.toString() }, "Access and refresh tokens generated successfully");
        return { accessToken, refreshToken };

    } catch (error) {
        userLogger.error(error, "Error generating access and refresh tokens", { userId: userId?.toString() });
        return { accessToken: null, refreshToken: null };
        // return new ApiResponse(500, undefined, "Something went wrong", error)

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
            new ApiResponse(400, undefined, "All fields are required", new Error("All fields are required"))
        );
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        userLogger.warn({ username, email }, "Registration attempt with existing username or email");
        return res.status(409).json(
            new ApiResponse(409, undefined, "User with email or username already exists", new Error("User with email or username already exists"))
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
            new ApiResponse(400, undefined, "Avatar file is required", new Error("Avatar file is required"))
        );
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, 'avatar');
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath, 'coverImage');
    }

    if (!avatar) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Avatar file is required", new Error("Avatar file is required"))
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
        userLogger.error({ userId: user._id.toString() }, "User created but not found after creation");
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong while registering the user", new Error("Something went wrong while registering the user"))
        );
    }

    const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to:`akhlaquea01@gmail.com,${email}`,
        subject: 'Hello from Akhlaque',
        html: registrationEmail({ userName: username })
    };

    sendEmail(mailOptions);

    userLogger.info({ userId: createdUser._id.toString(), username, email }, "User registered successfully");
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
            new ApiResponse(400, undefined, "username or email is required", new Error("username or email is required"))
        );
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        userLogger.warn({ username, email }, "Login attempt with non-existent user");
        return res.status(404).json(
            new ApiResponse(404, undefined, "User does not exist", new Error("User does not exist"))
        );
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        userLogger.warn({ userId: user._id.toString(), username, email }, "Login attempt with invalid password");
        return res.status(401).json(
            new ApiResponse(401, undefined, "Invalid user credentials", new Error("Invalid user credentials"))
        );
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
    if (accessToken === null || refreshToken === null) {
        userLogger.error({ userId: user._id.toString() }, "Failed to generate tokens during login");
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", new Error("Something went wrong"))
        );
    }
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    userLogger.info({ userId: user._id.toString(), username, email }, "User logged in successfully");
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
            $unset: { refreshToken: 1 } // Remove the refreshToken field.
        },
        { new: true }
    );

    // Define cookie options for security.
    const options = {
        httpOnly: true,
        secure: true
    };

    userLogger.info({ userId: req.user._id.toString() }, "User logged out successfully");
    // Clear the accessToken and refreshToken cookies and respond with a success message.
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
            new ApiResponse(401, undefined, "unauthorized request", new Error("unauthorized request"))
        );
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            userLogger.warn({ decodedUserId: decodedToken?._id?.toString() }, "Refresh token verification failed - user not found");
            return res.status(401).json(
                new ApiResponse(401, undefined, "Invalid refresh token", new Error("Invalid refresh token"))
            );
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            userLogger.warn({ userId: user._id.toString() }, "Refresh token mismatch - token expired or already used");
            return res.status(401).json(
                new ApiResponse(401, undefined, "Refresh token is expired or used", new Error("Refresh token is expired or used"))
            );
        }

        const options = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefereshTokens(user._id);

        userLogger.info({ userId: user._id.toString() }, "Access token refreshed successfully");
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
        userLogger.error(error, "Error refreshing access token");
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", new Error("Something went wrong"))
        );
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        userLogger.warn({ userId: req.user?._id.toString() }, "Password change attempt with invalid old password");
        return res.status(400).json(
            new ApiResponse(400, undefined, "Invalid old password", new Error("Invalid old password"))
        );
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    userLogger.info({ userId: req.user?._id.toString() }, "Password changed successfully");
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
            new ApiResponse(400, undefined, "All fields are required", new Error("All fields are required"))
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

    userLogger.info({ userId: req.user?._id.toString(), fullName, email }, "Account details updated successfully");
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "Avatar file is missing", new Error("Avatar file is missing"))
        );
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, 'avatar');

    if (!avatar.url) {
        userLogger.error({ userId: req.user?._id.toString() }, "Error uploading avatar to Cloudinary");
        return res.status(400).json(
            new ApiResponse(400, undefined, "Error while uploading on avatar", new Error("Error while uploading on avatar"))
        );
    }

    const user = await User.findById(req.user?._id).select("-password");

    if (!user) {
        userLogger.warn({ userId: req.user?._id.toString() }, "User not found during avatar update");
        return res.status(404).json(
            new ApiResponse(404, undefined, "User not found", new Error("User not found"))
        );
    }

    if (user.avatar) {
        await deleteFromCloudinaryByUrl(user.avatar, 'avatar');
        userLogger.debug({ userId: user._id.toString(), oldAvatar: user.avatar }, "Old avatar deleted from Cloudinary");
    }

    user.avatar = avatar.url;
    await user.save();

    userLogger.info({ userId: user._id.toString(), avatarUrl: avatar.url }, "Avatar image updated successfully");
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
            new ApiResponse(400, undefined, "Cover image file is missing", new Error("Cover image file is missing"))
        );
    }

    const user = await User.findById(req.user?._id).select("-password");

    if (!user) {
        userLogger.warn({ userId: req.user?._id.toString() }, "User not found during cover image update");
        return res.status(404).json(
            new ApiResponse(404, undefined, "User not found", new Error("User not found"))
        );
    }

    if (user.coverImage) {
        await deleteFromCloudinaryByUrl(user.coverImage, 'coverImage');
        userLogger.debug({ userId: user._id.toString(), oldCoverImage: user.coverImage }, "Old cover image deleted from Cloudinary");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath, 'coverImage');

    if (!coverImage.url) {
        userLogger.error({ userId: user._id.toString() }, "Error uploading cover image to Cloudinary");
        return res.status(400).json(
            new ApiResponse(400, undefined, "Error while uploading cover image", new Error("Error while uploading cover image"))
        );
    }

    user.coverImage = coverImage.url;
    await user.save();

    userLogger.info({ userId: user._id.toString(), coverImageUrl: coverImage.url }, "Cover image updated successfully");
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
            userLogger.debug({ options }, "Items fetched from Cloudinary successfully");
            return res.status(200).json(item);
        } else {
            userLogger.warn({ options }, "Unable to fetch items from Cloudinary");
            return res.status(500).json({ message: 'Unable to fetch images from Cloudinary' });
        }
    } catch (error) {
        userLogger.error(error, "Error fetching items from Cloudinary");
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        return res.status(400).json(
            new ApiResponse(400, undefined, "username is missing", new Error("username is missing"))
        );
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        userLogger.warn({ username }, "Channel not found");
        return res.status(404).json(
            new ApiResponse(404, undefined, "channel does not exists", new Error("channel does not exists"))
        );
    }

    userLogger.debug({ username, channelId: channel[0]._id.toString() }, "User channel fetched successfully");
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

// Get all users (excluding passwords & refresh tokens)
const getAllUsers = asyncHandler(async (req, res) => {
    try {
        const users = await User.find({}, "-password -refreshToken"); // Exclude sensitive fields

        if (!users.length) {
            userLogger.debug("No users found in database");
            return res.status(204).json(new ApiResponse(204, null, "No users found"));
        }

        userLogger.info({ totalUsers: users.length }, "All users fetched successfully");
        return res.status(200).json(new ApiResponse(200, {
            users,
            totalUsers: users.length || 0
        }, "Users fetched successfully"));
    } catch (error) {
        userLogger.error(error, "Error fetching all users");
        return res.status(500).json(new ApiResponse(500, undefined, "Something went wrong", error));
    }
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
    getItemsFromCloudinary,
    getAllUsers
};