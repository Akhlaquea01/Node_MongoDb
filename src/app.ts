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
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import communityRouter from "./routes/community.routes.js";
import bankRouter from "./routes/bank.routes.js";
import categoryRouter from "./routes/category.routes.js";
import budgetRouter from "./routes/budget.routes.js";

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/community", communityRouter);
app.use("/api/v1/account", bankRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/budget", budgetRouter);

// http://localhost:8000/api/v1/users/register

export { app };