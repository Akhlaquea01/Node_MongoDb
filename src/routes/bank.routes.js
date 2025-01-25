import { Router } from 'express';
import {
    createAccount, updateAccount, deleteAccount, getAccount
} from "../controllers/bank.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create").post(createAccount);
router.route("/:accountId").put(updateAccount);
router.route("/:accountId").delete(deleteAccount);
router.route("/get").get(getAccount)

export default router