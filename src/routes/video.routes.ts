import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
    downloadVideoById,
    streamVideo
} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file
const options = {
    // destination: "./public/uploaded_files",
    // fileFilter: customFileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // 1/2 MB limit for each file
    }
};
router
    .route("/")
    .get(getAllVideos)
    .post(
        upload(options).fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload(options).single("thumbnail"), updateVideo);

router.route("/download/:videoId").get(downloadVideoById);
router.route("/stream/:videoId").get(streamVideo);
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router