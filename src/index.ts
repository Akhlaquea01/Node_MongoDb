// IMPORTANT: Import instrumentation FIRST before any other application code
import './instrumentation.js';

import connectDB from "./db/index.js";
import { app } from './app.js';
import { setupWebSocketServer } from "./utils/websocket.js";
import logger from "./utils/logger.js";
import cronService from "./services/cron.service.js";
import agendaService from "./services/agenda.service.js";



connectDB()
    .then(async () => {
        // Setup WebSocket server first
        const { server, io } = setupWebSocketServer(app);

        // Start server immediately (don't wait for Agenda)
        server.listen(process.env.PORT || 5000, () => {
            logger.info({ port: process.env.PORT || 5000 }, '⚙️ Server is running');
        });

        // Initialize Agenda service (non-blocking, runs in background)
        logger.info('🔄 Starting Agenda service initialization...');
        agendaService.initialize()
            .then(() => {
                logger.info('✅ Agenda service initialized successfully');
            })
            .catch((error) => {
                logger.error(error, '❌ Failed to initialize Agenda service');
                logger.error({ error: error.message, stack: error.stack }, 'Agenda initialization error details');
            });

        // Cron tasks are NOT auto-started - use API endpoint /api/v1/cron/initialize to start them
        logger.info('💡 Cron tasks: Use POST /api/v1/cron/initialize to start cron tasks');

        // Graceful shutdown
        const gracefulShutdown = async () => {
            logger.info('🛑 Shutting down gracefully...');
            
            // Stop all cron tasks
            cronService.stopAllTasks();
            
            // Shutdown agenda
            await agendaService.shutdown();
            
            server.close(() => {
                logger.info('✅ Server closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    })
    .catch((err) => {
        logger.error(err, "MongoDB connection failed");
        process.exit(1);
    });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    const errorDetails = {
        reason: reason instanceof Error ? {
            message: reason.message,
            stack: reason.stack,
            name: reason.name
        } : String(reason),
        promise: promise?.toString() || 'Unknown promise'
    };
    logger.error(errorDetails, 'Unhandled Rejection at Promise');
    console.error('Unhandled Rejection Details:', reason);
    if (reason instanceof Error) {
        console.error('Error Stack:', reason.stack);
    }
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