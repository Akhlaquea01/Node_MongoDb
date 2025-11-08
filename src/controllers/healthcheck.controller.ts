import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const healthcheck = asyncHandler(async (req, res) => {
    // a healthcheck response that simply returns the OK status as json with a message
    const response = new ApiResponse(200, {}, "Server is healthy!!");
    return res
        .status(200)
        .json(response.toJSON());
});

export {
    healthcheck
}
