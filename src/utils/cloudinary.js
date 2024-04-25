import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        fs.unlinkSync(localFilePath); // Delete the locally saved temporary file
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // Remove the locally saved temporary file if the upload operation fails
        return null;
    }
};

// Function to delete a file from Cloudinary by URL
const deleteFromCloudinaryByUrl = async (fileUrl) => {
    try {
        const publicId = fileUrl.split('/').slice(-1)[0].split('.')[0]; // Extract public ID from URL
        const response = await cloudinary.uploader.destroy(publicId); // Delete the file from Cloudinary
        return response.result === 'ok'; // Return true if deletion is successful
    } catch (error) {
        return false;
    }
};

// Function to get all images from Cloudinary
const getAllImagesFromCloudinary = async () => {
    try {
        const response = await cloudinary.search
            .expression('resource_type:image')
            .sort_by('public_id', 'desc')
            .execute(); // Search for all images sorted by public_id in descending order
        return response.resources.map(image => image.secure_url); // Return an array of image URLs
    } catch (error) {
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinaryByUrl, getAllImagesFromCloudinary };
