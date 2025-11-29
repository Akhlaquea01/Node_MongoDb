import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from './utils/swaggerConfig.js';
import TelegramChatBot from './utils/telegramBot.js';
import dotenv from 'dotenv';
dotenv.config();
const app = express();




if (process.env.TELEGRAM_BOT_ENABLE=='START') {
    const token = process.env.YOUR_TELEGRAM_BOT_TOKEN;

    // Create an instance of TelegramChatBot
    const bot = new TelegramChatBot(token);

    // Start listening for any kind of message
    bot.handleMessage();

    // start listening for command
    bot.handleSummaryCommand();
}

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));


// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerConfig));


app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());



//routes import
import userRouter from './routes/user.routes.js';
import healthcheckRouter from "./routes/healthcheck.routes.js";
import videoRouter from "./routes/video.routes.js";
import icsRouter from "./routes/ics.routes.js";
import streamingRouter from "./routes/streaming.routes.js";

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/ics", icsRouter);
app.use("/api/v1/streaming", streamingRouter);

// http://localhost:8000/api/v1/users/register

// Error handling middleware (must be after all routes)
// Express recognizes error handlers by having exactly 4 parameters
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Error handler triggered:", err);
    
    // Don't send response if headers already sent
    if (res.headersSent) {
        return next(err);
    }
    
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal Server Error";
    
    try {
        res.status(statusCode).json({
            success: false,
            statusCode,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    } catch (error) {
        console.error("Error sending error response:", error);
        res.status(500).end();
    }
});

export { app };