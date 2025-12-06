import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    updateAccountDetails,
    getItemsFromCloudinary,
    getAllUsers
} from "../controllers/user.controller.js";
import  {upload}  from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/security.middleware.js";
import { validateRegister, validateLogin, validateChangePassword, validateUpdateAccount } from "../middlewares/validation.middleware.js";


const router = Router();
const options = {
    // destination: "./public/uploaded_files",
    // fileFilter: customFileFilter,
    limits: {
        fileSize: 1024 * 1024 * 0.5 // 1/2 MB limit for each file
    }
};

// Authentication routes with rate limiting and validation
router.route("/register").post(
    authLimiter, // Rate limit authentication attempts
    validateRegister, // Validate input using express-validator
    upload(options).fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(
    authLimiter, // Rate limit authentication attempts
    validateLogin, // Validate input
    loginUser
);

//secured routes
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(
    verifyJWT,
    validateChangePassword, // Validate password change input
    changeCurrentPassword
);

router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/all-user").get(verifyJWT, getAllUsers);
router.route("/all-items").post(verifyJWT, getItemsFromCloudinary);

router.route("/update-account").patch(
    verifyJWT,
    validateUpdateAccount, // Validate account update input
    updateAccountDetails
);

router.route("/avatar").patch(verifyJWT, upload(options).single("avatar"), updateUserAvatar);
// router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/cover-image").patch(verifyJWT, upload().single("coverImage"), updateUserCoverImage);

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;