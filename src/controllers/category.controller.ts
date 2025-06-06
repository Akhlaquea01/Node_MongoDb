// Finance Tracker App
import { asyncHandler } from "../utils/asyncHandler.js";
import { Category } from "../models/category.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";



const createCategory = asyncHandler(async (req, res) => {
    try {
        const { name, isDefault, icon, parentCategory, transactionType,color } = req.body;
        const userId = req.user._id;
        // Check if category with the same name already exists for the same user
        const existingCategory = await Category.findOne({ name, userId });
        if (existingCategory) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Category with this name already exists for the user.", new Error("Category with this name already exists for the user."))
            );
        }

        // Create a new category
        const category = new Category({
            name,
            isDefault,
            userId,
            icon,
            color,
            parentCategory,
            transactionType: transactionType || "debit", // Default to debit if not provided
        });

        await category.save();

        return res.status(201).json(new ApiResponse(201, { category }, "Category created successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

const getCategories = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { transactionType } = req.query;

        // Build the query for predefined categories
        const predefinedQuery: any = { isDefault: true };
        if (transactionType) {
            predefinedQuery.transactionType = transactionType;
        }

        // Fetch predefined categories (always included)
        const predefinedCategories = await Category.find(predefinedQuery).exec();

        // Build the query for custom categories
        const customQuery: any = { userId, isDefault: false };
        if (transactionType) {
            customQuery.transactionType = transactionType;
        }

        // Fetch user-specific custom categories if userId is provided and valid
        let customCategories = [];
        if (userId && userId !== '0') {
            customCategories = await Category.find(customQuery).populate('parentCategory').exec();
        }

        // Merge both categories
        const categories = [...predefinedCategories, ...customCategories];

        return res.status(200).json(new ApiResponse(200, {
            categories,
            totalRecords: categories.length || 0
        }, "Categories fetched successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});
const updateCategory = asyncHandler(async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, icon, parentCategory,color } = req.body;

        // Check if the category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Category not found.", new Error("Category not found."))
            );
        }

        // If parentCategory is provided, check if it exists in the database
        if (parentCategory) {
            const parentCategoryExists = await Category.findById(parentCategory);
            if (!parentCategoryExists) {
                return res.status(400).json(
                    new ApiResponse(400, undefined, "Parent category does not exist.", new Error("Parent category does not exist."))
                );
            }
        }

        // Update category
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, {
            name,
            icon,
            parentCategory,
            color,
        }, { new: true });

        return res.status(200).json(new ApiResponse(200, { updatedCategory }, "Category updated successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }
});

const deleteCategory = asyncHandler(async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Find and delete the category
        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(400).json(
                new ApiResponse(400, undefined, "Category not found.", new Error("Category not found."))
            );
        }

        return res.status(200).json(new ApiResponse(200, null, "Category deleted successfully"));
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong", error)
        );
    }

});


export {
    createCategory, getCategories, updateCategory, deleteCategory

};