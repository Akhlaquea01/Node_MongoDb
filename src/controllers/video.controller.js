import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    // Ensure userId is provided
    if (!userId) {
        throw new ApiError(400, "userId is required");
    }

    const pipeline = [];

    // Match videos by userId
    if (userId) {
        await User.findById(userId);
        pipeline.push({
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        });
    }

    // Match videos by query (e.g., isPublished)
    if (query) {
        pipeline.push({
            $match: { isPublished: true }
        });
    }

    // Sorting
    let sortField = {};
    if (sortBy && sortType) {
        sortField[sortBy] = sortType === "asc" ? 1 : -1;
    } else {
        sortField["createdAt"] = -1; // Default sorting by createdAt in descending order
    }
    pipeline.push({ $sort: sortField });

    // Pagination
    pipeline.push({ $skip: (page - 1) * parseInt(limit) });
    pipeline.push({ $limit: parseInt(limit) });

    /*
        Example pipeline:
        [
            { '$match': { owner: new ObjectId('65e0782461c4addc4efa7528') } },
            { '$match': { isPublished: true } },
            { '$sort': { createdAt: -1 } },
            { '$skip': 0 },
            { '$limit': 10 }
        ]
    */

    // Aggregate videos
    const allVideos = await Video.aggregate(pipeline);

    // Check if any videos found
    if (!allVideos || allVideos.length === 0) {
        throw new ApiError(404, "No videos found");
    }

    // Send response
    res.status(200).json(new ApiResponse(
        200,
        allVideos,
        `All videos retrieved. Count: ${allVideos.length}`
    ));
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    if (!(title && description)) {
        throw new ApiError(400, "user should provide title and discription");
    }

    const videoUrl = req.files?.videoFile[0]?.path;
    const thumbnailUrl = req.files?.thumbnail[0]?.path;

    if (!videoUrl) {
        throw new ApiError(400, "video path is required");
    }
    if (!thumbnailUrl) {
        throw new ApiError(400, "thumbnail path is required");
    }

    const video = await uploadOnCloudinary(videoUrl,'videoUrl');
    const thumbnail = await uploadOnCloudinary(thumbnailUrl,'thumbnailUrl');
    console.log(video);


    const videoData = await Video.create({
        videoFile: video?.url,
        thumbnail: thumbnail?.url,
        owner: req.user?._id,
        title: title,
        description: description,
        duration: video.duration,
        views: 0,
        isPublished: true,
    });
    return res.status(200).json(
        new ApiResponse(
            200,
            videoData,
            "video published succcessfully"

        )
    );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail

});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
