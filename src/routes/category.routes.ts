// Finance Tracker App
import { Router } from 'express';
import {
    createCategory, getCategories, updateCategory, deleteCategory
} from "../controllers/category.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create").post(createCategory);
router.route("/getAll").get(getCategories);
router.route("/:categoryId").put(updateCategory);
router.route("/:categoryId").delete(deleteCategory);

export default router