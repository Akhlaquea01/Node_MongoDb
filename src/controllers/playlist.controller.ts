import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!(name || description)) {
        throw new ApiError(400, "for creation name and descripton is req.");
    }

    const playlistCreation = await Playlist.create({
        name: name,
        description: description || "",
        owner: req.user?._id,
        videos: []
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            playlistCreation,
            "playlist created successfully"
        )
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "userid cannot found");
    }

    const userExisted = await User.findById(userId);
    if (!userExisted) {
        throw new ApiError(400, "user whose playlist we are searching doesnot exist");
    }

    const userAllPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: 1,
                videos: {
                    $cond: {
                        if: ["$owner", new mongoose.Types.ObjectId(req.user?._id)],
                        then: "$videos",
                        else: {
                            $filter: {
                                input: '$videos',
                                as: 'videoofarray',
                                cond: { $gt: ['$videoofarray.isPublished', true] }
                            }
                        }
                    }
                },
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);
    if (!userAllPlaylists) {
        throw new ApiError(400, "user doesnot have playlist");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            userAllPlaylists,
            "user all playlists"
        )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "for deletion u must provide playlist id is necesary");
    }

    const playlistGetById = await Playlist.findById(playlistId);
    if (!playlistGetById) {
        throw new ApiError(400, "Playlist cannot get by id");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            playlistGetById,
            "playlist found"
        )
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;



    if (!playlistId) {
        throw new ApiError(400, "Cannot get playlist id");
    }

    if (!videoId) {
        throw new ApiError(400, "Cannot get video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(400, "Cannot find the playlist");
    }

    const videoFound = await Video.findById(videoId);
    //   console.log(videoFound.owner.toString());
    //   console.log(req.user?._id);


    if (!videoFound ) {
        throw new ApiError(400, "Video not found while searching through videoid");
    }

    const videoAlreadyHave = await playlist.videos.includes(videoId);

    if (videoAlreadyHave) {
        return res.status(200).json(
            new ApiResponse(
                200,
                "already have that video"
            )
        );
    }
    console.log(videoFound);
    const video = playlist.videos.push(videoFound);
    playlist.save();
    //  console.log(playlist.videos);
    return res.status(200).json(
        new ApiResponse(
            200,
            `video added total video:${video}`
        )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!(playlistId && videoId)) {
        throw new ApiError(400, "playlistid an dvideo id is required");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(400, "playlist is not found");
    }

    if (!(playlist.owner.toString() === req.user?._id.toString())) {
        throw new ApiError(400, "user has to login by his id of for removing video from playlist");
    }

    const video = await Video.findById(videoId);
    if (!video || !(video.owner.toString() == req.user?._id.toString())) {
        throw new ApiError(400, "video is not found");
    }

    const videoExist = await playlist.videos.includes(videoId);
    if (!videoExist) {
        throw new ApiError(400, "video does not exist in playliist");
    }

    const pulled = playlist.videos.remove(video);
    playlist.save();
    return res.status(200).json(
        new ApiResponse(
            200,
            pulled,
            "video removed from playlist")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;


    if (!playlistId) {
        throw new ApiError(400, "for deletion u must provide playlist id is necesary");
    }



    const deleteChecker = await Playlist.findByIdAndDelete({
        _id: playlistId,
    });

    if (!deleteChecker) {
        throw new ApiError(400, "unable to delete playlist");
    }
    if (!(deleteChecker.owner.toString() === req.user?._id.toString())) {
        throw new ApiError(400, "user has to login by his id of for deletion");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            "Deleted successfully"
        )
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!playlistId) {
        throw new ApiError(400, "for updation u must provide playlist id is necesary");

    }

    if (!(name && description)) {
        throw new ApiError(400, "for updation name and description is necesary");
    }

    const platlistFound = await Playlist.findById(playlistId);
    if (!platlistFound) {
        throw new ApiError(400, "playlist need for updation deoesnt exist");
    }

    if (!(platlistFound.owner.toString() === req.user?._id.toString())) {
        throw new ApiError(400, "user has to login by his id of for updation");
    }

    if (platlistFound.name == name || platlistFound.description == description) {
        throw new ApiError(400, "Proide some unique name and description these are alreday there");
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId },
        {
            $set: {
                name: name,
                description: description,
            }
        },
        { new: true }
    );

    res.status(200).json(
        new ApiResponse(
            200,
            updatePlaylist,
            "name and description updated"
        )
    );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};
