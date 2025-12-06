import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Prioritize Authorization header over cookies (for Swagger UI and API clients)
        // This ensures Swagger UI uses the token from the Authorization header, not cached cookies
        const authHeader = req.header("Authorization");
        const tokenFromHeader = authHeader?.replace("Bearer ", "").trim();
        const tokenFromCookie = req.cookies?.accessToken;
        
        // Use header token first (for Swagger/API), fallback to cookie (for browser requests)
        const token = tokenFromHeader || tokenFromCookie;

        if (!token) {
            return res.status(401).json(
                new ApiResponse(401, undefined, "Unauthorized: No access token provided", new Error("Invalid access token"))
            );
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as any;

        if (!decodedToken?._id) {
            return res.status(401).json(
                new ApiResponse(401, undefined, "Invalid access token: Token payload invalid", new Error("Invalid access token"))
            );
        }

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        if (!user) {
            return res.status(401).json(
                new ApiResponse(401, undefined, "Invalid access token: User not found", new Error("Invalid access token"))
            );
        }

        req.user = user;
        next();
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json(
                new ApiResponse(401, undefined, `Invalid access token: ${error.message}`, error)
            );
        }
        return res.status(401).json(
            new ApiResponse(401, undefined, "Invalid access token", error)
        );
    }

});