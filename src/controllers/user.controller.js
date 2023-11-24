import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/FileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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


export {
    registerUser,
};