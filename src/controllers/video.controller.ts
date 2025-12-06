import mongoose from "mongoose";
import fs from "fs";
import mkdirp from 'mkdirp'
import path from "path";
import mime from "mime-types";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinaryByUrl, downloadFile } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

const videoLogger = logger.child({ module: 'video' });


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
    const sortField = {};
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

    const video = await uploadOnCloudinary(videoUrl, 'video');
    const thumbnail = await uploadOnCloudinary(thumbnailUrl, 'thumbnail');
    videoLogger.debug({ video: video?.url, thumbnail: thumbnail?.url }, "Video uploaded to Cloudinary");


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

    const userVideo = await Video.findById(videoId);
    videoLogger.debug({ 
        videoOwner: userVideo?.owner.toString(), 
        requestUserId: req.user?._id.toString() 
    }, "Checking video ownership");

    if (!userVideo || ((!userVideo.isPublished) && (!userVideo.owner === req.user._id))) {
        throw new ApiError(400, "video ur seacrching for doesnot exist");
    }



    return res.status(200).json(
        new ApiResponse(
            200,
            userVideo,
            "video found successfullly"
        )
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body;
    if (!(title || description)) {
        throw new ApiError(400, "user should provide title or discription");
    }
    const thumbnailUrl = req.file?.path;

    if (!thumbnailUrl) {
        throw new ApiError(400, "thumbnail path is required");
    }

    const myVideo = await Video.findById(videoId);

    if (!myVideo || !(myVideo.owner.toString() === req.user._id.toString())) {
        throw new ApiError(400, "Cannot find the video");
    }

    const updatedthumbnail = await uploadOnCloudinary(thumbnailUrl);
    await deleteFromCloudinaryByUrl(myVideo.thumbnail);
    const newVideo = await Video.findByIdAndUpdate(videoId
        ,
        {
            $set: {
                title: title,
                description: description,
                thumbnail: updatedthumbnail?.url
            }
        },
        {
            new: true,
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            newVideo,
            "updated successfully"
        )
    );

});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    const myVideo = await Video.findById(videoId);

    if (!myVideo || !(myVideo.owner.toString() === req.user._id.toString())) {
        throw new ApiError(400, "Cannot find the video");
    }

    await deleteFromCloudinaryByUrl(myVideo.videoFile);
    await Video.findByIdAndDelete(videoId);
    return res.status(200).json(
        new ApiResponse(
            200,
            "Deleted successfully"
        )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "id not accessable");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video doesnot existed");
    }


    if (!video.owner.toString() == req.user?._id) {
        throw new ApiError(400, "Not allowed to toggle");
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            video.isPublished,
            "check published or not"

        )
    );
});

const downloadVideoById = async (req, res, next) => {
    try {
        const { videoId } = req.params;

        // Find the video by ID in your database
        const video = await Video.findById(videoId);

        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }

        // Define the local directory path to save the downloaded video
        const downloadDirectory = './downloads';
        // Create the directory if it doesn't exist
        await mkdirp(downloadDirectory);

        // Define the local file path to save the downloaded video
        const localFilePath = `${downloadDirectory}/${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;

        try {
            // Validate video URL before attempting download
            if (!video.videoFile || typeof video.videoFile !== 'string') {
                return res.status(400).json({ 
                    message: "Video file URL is invalid or missing",
                    videoId: videoId 
                });
            }

            // Download the video from Cloudinary and save it locally
            await downloadFile(video.videoFile, localFilePath);

            // Check if file exists after download
            if (!fs.existsSync(localFilePath)) {
                throw new Error("File was not downloaded successfully");
            }

            // Set headers for the download response
            res.setHeader("Content-Type", "video/mp4");
            res.setHeader("Content-Disposition", `attachment; filename="${video.title}.mp4"`);

            // Create a read stream from the local file and pipe it to the response
            const stream = fs.createReadStream(localFilePath);
            
            // Handle stream errors
            stream.on('error', (err) => {
                if (!res.headersSent) {
                    res.status(500).json({ message: "Error reading file" });
                }
            });

            // Clean up the file after sending
            stream.on('end', () => {
                fs.unlink(localFilePath, (err) => {
                    if (err) {videoLogger.error(err, 'Error deleting temp file');}
                });
            });

            stream.pipe(res);
        } catch (downloadError) {
            // Provide specific error messages based on the error type
            if (downloadError.message.includes('HTTP 404')) {
                return res.status(404).json({ 
                    message: "Video file not found on server. The video may have been deleted or moved.",
                    videoId: videoId,
                    videoUrl: video.videoFile
                });
            } else if (downloadError.message.includes('Network error')) {
                return res.status(503).json({ 
                    message: "Unable to reach video server. Please try again later.",
                    videoId: videoId
                });
            } else if (downloadError.message.includes('Invalid video URL')) {
                return res.status(400).json({ 
                    message: "Video file URL is invalid",
                    videoId: videoId
                });
            } else {
                return res.status(500).json({ 
                    message: "Error downloading video: " + downloadError.message,
                    videoId: videoId
                });
            }
        }
    } catch (error) {
        videoLogger.error(error, "Error in downloadVideoById", { videoId: req.params.videoId });
        next(error);
    }
};

// Static Video Streaming with Range Requests
const streamVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Find the video by ID in your database
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if video is published or user owns it
    if (!video.isPublished && video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Access denied - Video not published");
    }

    // Define the local directory path for video files
    const videoDirectory = './downloads';
    const localFilePath = `${videoDirectory}/${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;

    // Check if local file exists, if not download it
    if (!fs.existsSync(localFilePath)) {
        try {
            await mkdirp(videoDirectory);
            await downloadFile(video.videoFile, localFilePath);
        } catch (downloadError) {
            throw new ApiError(500, "Error preparing video for streaming");
        }
    }

    // Get video file stats
    const videoStats = fs.statSync(localFilePath);
    const videoSize = videoStats.size;
    const videoMimeType = mime.lookup(localFilePath) || "video/mp4";

    // Handle Range header for partial content
    const range = req.headers.range;
    
    if (!range) {
        // If no Range header, send the entire video
        const headers = {
            "Content-Length": videoSize,
            "Content-Type": videoMimeType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000"
        };
        res.writeHead(200, headers);
        return fs.createReadStream(localFilePath).pipe(res);
    }

    // Parse Range header
    const CHUNK_SIZE = 10 ** 6; // 1MB chunks
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const contentLength = end - start + 1;

    // Set partial content headers
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": videoMimeType,
        "Cache-Control": "public, max-age=31536000"
    };

    res.writeHead(206, headers); // 206 = Partial Content

    // Create read stream for the specific range
    const videoStream = fs.createReadStream(localFilePath, { start, end });
    videoStream.pipe(res);

    // Increment view count
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
});




export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    downloadVideoById,
    streamVideo
};
