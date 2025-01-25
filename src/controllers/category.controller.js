// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Account, Transaction } from "../models/bank.model.js";
import { Category } from "../models/category.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";



const createCategory = asyncHandler(async (req, res) => {
    try {
        const { name, type, userId, icon, parentCategory } = req.body;

        // Check if category with the same name already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            throw new ApiError(400, "Category with this name already exists.");
        }

        // Create a new category
        const category = new Category({
            name,
            type,
            userId,
            icon,
            parentCategory,
        });

        await category.save();

        return res.status(201).json(new ApiResponse(201, { category }, "Category created successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});
const getCategories = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params; // Optional: fetch by userId for custom categories, all otherwise

        let categories;
        if (userId) {
            // Fetch custom categories for a user
            categories = await Category.find({ userId }).populate('parentCategory').exec();
        } else {
            // Fetch all predefined categories
            categories = await Category.find({ type: "predefined" }).exec();
        }

        if (!categories) {
            throw new ApiError(404, "No categories found.");
        }

        return res.status(200).json(new ApiResponse(200, { categories }, "Categories fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});
const updateCategory = asyncHandler(async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, icon, parentCategory } = req.body;

        // Update category
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, {
            name,
            icon,
            parentCategory,
        }, { new: true });

        if (!updatedCategory) {
            throw new ApiError(404, "Category not found.");
        }

        return res.status(200).json(new ApiResponse(200, { updatedCategory }, "Category updated successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});
const deleteCategory = asyncHandler(async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Find and delete the category
        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            throw new ApiError(404, "Category not found.");
        }

        return res.status(200).json(new ApiResponse(200, null, "Category deleted successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating the account", error.message);
    }

});


export {
    createCategory, getCategories, updateCategory, deleteCategory

};