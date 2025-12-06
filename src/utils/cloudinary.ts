import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import axios from "axios";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (localFilePath, folder = '') => {
    try {
        if (!localFilePath) {return null;}
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
const deleteFromCloudinaryByUrl = async (fileUrl, folder:any = '') => {
    try {
        const publicId = fileUrl.split('/').slice(-1)[0].split('.')[0]; // Extract public ID from URL
        const response = await cloudinary.uploader.destroy(publicId); // Delete the file from Cloudinary
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
const getAllItemsFromCloudinary = async (options:any = {}) => {
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

// Function to validate Cloudinary URL format
const isValidCloudinaryUrl = (url) => {
    if (!url || typeof url !== 'string') {return false;}
    
    // Check if it's a valid Cloudinary URL format
    const cloudinaryPattern = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw|auto)\/upload\/.*$/;
    return cloudinaryPattern.test(url);
};

// Function to check if a Cloudinary URL exists
const checkCloudinaryUrlExists = async (url) => {
    try {
        const response = await axios.head(url, { timeout: 10000 });
        return response.status === 200;
    } catch (error) {
        return false;
    }
};

// Function to attempt to fix corrupted Cloudinary URLs
const attemptUrlFix = (url) => {
    if (!url) {return null;}
    
    // Check if URL is missing protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
    }
    
    // Check if URL is missing the res.cloudinary.com part
    if (url.includes('cloudinary.com') && !url.includes('res.cloudinary.com')) {
        return url.replace('cloudinary.com', 'res.cloudinary.com');
    }
    
    return url;
};

const downloadFile = async (videoUrl, localFilePath) => {
    try {
        // Validate URL
        if (!videoUrl || typeof videoUrl !== 'string') {
            throw new Error('Invalid video URL provided');
        }

        // Check if it's a valid Cloudinary URL
        if (!isValidCloudinaryUrl(videoUrl)) {
            const fixedUrl = attemptUrlFix(videoUrl);
            if (fixedUrl && fixedUrl !== videoUrl) {
                videoUrl = fixedUrl;
                
                if (!isValidCloudinaryUrl(videoUrl)) {
                    throw new Error('Invalid Cloudinary URL format. Expected format: https://res.cloudinary.com/...');
                }
            } else {
                throw new Error('Invalid Cloudinary URL format. Expected format: https://res.cloudinary.com/...');
            }
        }

        // Check if URL exists before attempting download
        const urlExists = await checkCloudinaryUrlExists(videoUrl);
        if (!urlExists) {
            throw new Error('Video file not found on Cloudinary. The video may have been deleted or moved.');
        }

        // Make a GET request to the video URL
        const response = await axios.get(videoUrl, { 
            responseType: 'stream',
            timeout: 30000,
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            }
        });

        // Create a writable stream to save the file
        const writer = fs.createWriteStream(localFilePath);

        // Pipe the response data to the writable stream
        response.data.pipe(writer);
        
        // Return a promise that resolves when the download is complete
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(localFilePath));
            writer.on('error', (err) => reject(err));
            response.data.on('error', (err) => reject(err));
        });
    } catch (error) {
        if (error.response) {
            throw new Error(`Video not found or inaccessible (HTTP ${error.response.status})`);
        } else if (error.request) {
            throw new Error("Network error: Unable to reach video server");
        } else {
            throw error;
        }
    }
};

export {
    uploadOnCloudinary,
    deleteFromCloudinaryByUrl,
    getAllImagesFromCloudinary,
    getAllItemsFromCloudinary,
    downloadFile
};
