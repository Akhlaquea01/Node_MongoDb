import { Router } from 'express';
import {
    createCommunity,
    addUserToCommunity,
    getUserCommunities
} from "../controllers/community.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.post('/create', createCommunity);
router.post('/addUser', addUserToCommunity);
router.get('/getAll', getUserCommunities);


export default router;