// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Account, Transaction } from "../models/bank.model.js";
import { Category } from "../models/category.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";



const createCategory = asyncHandler(async (req, res) => {
    try {
        const { name, type, userId, icon, parentCategory } = req.body;

        // Check if category with the same name already exists for the same user
        const existingCategory = await Category.findOne({ name, userId });
        if (existingCategory) {
            throw new ApiError(400, "Category with this name already exists for the user.");
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
        throw new ApiError(500, "Something went wrong while creating the category", error.message);
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

        // Check if the category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new ApiError(404, "Category not found.");
        }

        // If parentCategory is provided, check if it exists in the database
        if (parentCategory) {
            const parentCategoryExists = await Category.findById(parentCategory);
            if (!parentCategoryExists) {
                throw new ApiError(400, "Parent category does not exist.");
            }
        }

        // Update category
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, {
            name,
            icon,
            parentCategory,
        }, { new: true });

        return res.status(200).json(new ApiResponse(200, { updatedCategory }, "Category updated successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while updating the category", error.message);
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