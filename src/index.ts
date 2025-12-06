// IMPORTANT: Import instrumentation FIRST before any other application code
import './instrumentation.js';

import connectDB from "./db/index.js";
import { app } from './app.js';
import { setupWebSocketServer } from "./utils/websocket.js";
import logger from "./utils/logger.js";



connectDB()
    .then(() => {
        // Setup WebSocket server
        const { server, io } = setupWebSocketServer(app);

        
        server.listen(process.env.PORT || 8000, () => {
            logger.info({ port: process.env.PORT || 8000 }, '⚙️ Server is running');
        });
    })
    .catch((err) => {
        logger.error(err, "MongoDB connection failed");
        process.exit(1);
    });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Rejection at Promise');
    // Don't exit in development, but log the error
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(error, 'Uncaught Exception');
    process.exit(1);
});

/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            logger.error(error, "Application error");
            throw error
        })

        app.listen(process.env.PORT, () => {
            logger.info({ port: process.env.PORT }, "App is listening");
        })

    } catch (error) {
        logger.error(error, "ERROR")
        throw err
    }
})()

*/