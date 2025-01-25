import mongoose, { Schema } from "mongoose";

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Ensure category names are unique globally or per user.
    },
    type: {
        type: String,
        enum: ["predefined", "custom"],
        default: "predefined", // Predefined categories are available to all users.
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null, // Null for predefined categories, populated for custom ones.
    },
    icon: {
        type: String,
        default: null, // Optional field to store an icon or emoji for the category.
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null, // To support subcategories.
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Category", CategorySchema);
