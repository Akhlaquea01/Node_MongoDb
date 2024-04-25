import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (localFilePath, folder = '') => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: folder // Include folder parameter in the upload options
        });
        fs.unlinkSync(localFilePath); // Delete the locally saved temporary file
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

// Function to delete a file from Cloudinary by URL
const deleteFromCloudinaryByUrl = async (fileUrl, folder = '') => {
    try {
        const publicId = fileUrl.split('/').slice(-1)[0].split('.')[0]; // Extract public ID from URL
        const response = await cloudinary.uploader.destroy(publicId, { folder }); // Delete the file from Cloudinary
        return response.result === 'ok';
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

// Function to get all items from Cloudinary with options for folder name, directory path, and resource type
const getAllItemsFromCloudinary = async (options = {}) => {
    try {
        let expression = '';
        if (options.folderName) {
            expression += `folder=${options.folderName}`;
        }
        if (options.resourceType && !expression.includes('resource_type')) {
            expression += (expression ? ' AND ' : '') + `resource_type=${options.resourceType}`;
        }

        // If neither folderName nor resourceType is provided, default to 'image' resource_type
        if (!expression.includes('folder=') && !expression.includes('resource_type')) {
            expression = 'resource_type:image';
        }

        const response = await cloudinary.search
            .expression(expression)
            .sort_by('public_id', 'desc')
            .execute(); // Search for items based on the expression

        let items = response.resources.map(item => item); // Get array of item

        // If directoryPath is provided, append it to the item URLs
        if (options.directoryPath) {
            items = items.map(item => options.directoryPath + '/' + item.split('/').pop());
        }

        return items; // Return array of item URLs
    } catch (error) {
        return null;
    }
};


export { uploadOnCloudinary, deleteFromCloudinaryByUrl, getAllImagesFromCloudinary, getAllItemsFromCloudinary };
