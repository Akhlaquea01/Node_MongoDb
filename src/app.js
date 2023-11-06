import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb" })); //Accept JSON till 16kb limit
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); //To store data on server temp

app.use(cookieParser());

export { app };