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
    })

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