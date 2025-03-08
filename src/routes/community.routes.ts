import { Router } from 'express';
import {
    createCommunity,
    addUserToCommunity,
    getUserCommunities
} from "../controllers/community.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file
/**
 * @swagger
 * tags:
 *   name: Community
 *   description: Community management
 */

/**
 * @swagger
 * /api/v1/community/create:
 *   post:
 *     summary: Create a new community
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         description: Access token with Bearer scheme
 *         required: true
 *         schema:
 *           type: string
 *           format: JWT
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjI1NzFiZmUwMDU4ZjZiNTUwNGE5NjQiLCJlbWFpbCI6ImF0dHNAZ21haWwuY29tIiwidXNlcm5hbWUiOiJhdHRzMTQiLCJmdWxsTmFtZSI6IkFraGxhcXVlIEFobWFkIiwiaWF0IjoxNzE1NDk2NjY1LCJleHAiOjE3MTU1ODMwNjV9.FUSd4cSVP8_DvzH6DhfKrovSlRG1LXYB2zpuiyCMsZ8"
 *       - in: body
 *         name: body
 *         description: name and description
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: community Name
 *             description:
 *               type: string
 *               description: community Description
 *     responses:
 *       200:
 *         description: Community created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "test group2"
 *                     description:
 *                       type: string
 *                       example: "test description2"
 *                     users:
 *                       type: array
 *                       example: []
 *                     _id:
 *                       type: string
 *                       example: "66406997800b7c6199e96db8"
 *                     createdAt:
 *                       type: string
 *                       example: "2024-05-12T07:02:47.456Z"
 *                     updatedAt:
 *                       type: string
 *                       example: "2024-05-12T07:02:47.456Z"
 *                     __v:
 *                       type: integer
 *                       example: 0
 *                 message:
 *                   type: string
 *                   example: "Community created successfully"
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

router.post('/create', createCommunity);

/**
 * @swagger
 * /api/v1/community/addUser:
 *   post:
 *     summary: Add a user to a community
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         description: Access token with Bearer scheme
 *         required: true
 *         schema:
 *           type: string
 *           format: JWT
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjI1NzFiZmUwMDU4ZjZiNTUwNGE5NjQiLCJlbWFpbCI6ImF0dHNAZ21haWwuY29tIiwidXNlcm5hbWUiOiJhdHRzMTQiLCJmdWxsTmFtZSI6IkFraGxhcXVlIEFobWFkIiwiaWF0IjoxNzE1NDk2NjY1LCJleHAiOjE3MTU1ODMwNjV9.FUSd4cSVP8_DvzH6DhfKrovSlRG1LXYB2zpuiyCMsZ8"
 *       - in: body
 *         name: body
 *         description: Community ID and User ID
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             communityId:
 *               type: string
 *               description: ID of the community
 *             userId:
 *               type: string
 *               description: ID of the user to add
 *     responses:
 *       200:
 *         description: User added to the community successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "663fc813e98c1a3e0461a6c6"
 *                     name:
 *                       type: string
 *                       example: "test group"
 *                     description:
 *                       type: string
 *                       example: "test description"
 *                     users:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "662571bfe0058f6b5504a964"
 *                     createdAt:
 *                       type: string
 *                       example: "2024-05-11T19:33:39.202Z"
 *                     updatedAt:
 *                       type: string
 *                       example: "2024-05-11T19:36:45.371Z"
 *                     __v:
 *                       type: integer
 *                       example: 2
 *                 message:
 *                   type: string
 *                   example: "User added to community successfully"
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */


router.post('/addUser', addUserToCommunity);

/**
 * @swagger
 * /api/v1/community/getAll:
 *   get:
 *     summary: Get all communities for a user
 *     tags: [Community]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         description: Access token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of communities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   description: HTTP status code
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: ID of the community
 *                         example: "663fc813e98c1a3e0461a6c6"
 *                       name:
 *                         type: string
 *                         description: Name of the community
 *                         example: "test group"
 *                       description:
 *                         type: string
 *                         description: Description of the community
 *                         example: "test description"
 *                       users:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: IDs of users in the community
 *                         example: ["662571bfe0058f6b5504a964", "662cf6db63372dfedd4e62c4"]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Date and time when the community was created
 *                         example: "2024-05-11T19:33:39.202Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Date and time when the community was last updated
 *                         example: "2024-05-11T19:36:45.371Z"
 *                 message:
 *                   type: string
 *                   description: Message indicating the success of the operation
 *                   example: "Communities fetched successfully"
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful
 *                   example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

router.get('/getAll', getUserCommunities);

export default router;
