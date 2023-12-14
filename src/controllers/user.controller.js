import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/FileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access And Refresh Tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details
    const { userName, email, fullName, password } = req.body;

    // validate data
    if ([userName, email, fullName, password].some((field) =>
        field?.trim() === ""
    )) {
        throw new ApiError(400, "All fields are required");
    }

    // check for duplicate
    const existingUser = await User.findOne({
        $or: [{ userName }, { email }]
    });
    if (existingUser) {
        throw new ApiError(409, "user exists");
    }
    // check for images,avtar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath = '';
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(409, "Avatar required");
    }
    // upload image to cloudinary and check

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // if (coverImageLocalPath) {
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // }
    if (!avatar) {
        throw new ApiError(409, "Avatar required");
    }
    // create User object and create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    });
    // remove password and token field from response

    // check for user creation
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "User creation failed");
    }
    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered sucessfully")
    );

});

const loginUser = asyncHandler(async (req, res) => {
    // request body data
    const { email, userName, password } = req.body;

    // check username or email
    if (!(userName || email)) {
        throw new ApiError(400, "username or email is required");
    }

    // find the user
    const user = await User.findOne({
        $or: [{ userName }, { email }]
    });
    if (!user) {
        throw new ApiError(400, "User Does Not exist");
    }

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "User Password Not valid");
    }

    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // send cookies 
    const loggenInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true
    };

    // send response
    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggenInUser, accessToken, refreshToken
                },
                "User Logged In Successfully"
            )
        );
});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: { refreshToken: undefined }
    }, {
        new: true
    });

    const options = {
        httpOnly: true,
        secure: true
    };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged out"));
});

export {
    registerUser, loginUser, logoutUser
};