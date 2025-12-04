import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import logger from "../utils/logger.js";

const dbLogger = logger.child({ module: 'database' });

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        dbLogger.info({ 
            host: connectionInstance.connection.host,
            dbName: DB_NAME 
        }, "MongoDB connected successfully");
    } catch (error) {
        dbLogger.error(error, "MongoDB connection failed");
        process.exit(1);
    }
};

export default connectDB;