import { Server, Socket } from "socket.io";
import http from "http";
import { Express } from "express";
import logger from "./logger.js";

interface ChatMessage {
    message: string;
    timestamp?: Date;
}

const wsLogger = logger.child({ module: 'websocket' });

export function setupWebSocketServer(app: Express): { server: http.Server; io: Server } {
    const server = http.createServer(app);

    // Configure CORS
    const io = new Server(server, {
        cors: {
            origin: process.env.SOCKET_ORIGIN || "*",
            credentials: true
        }
    });

    io.on("connection", (socket: Socket) => {
        wsLogger.info({ socketId: socket.id }, "User connected");

        // Handle chat message event
        socket.on("chat message", (msg: ChatMessage) => {
            wsLogger.debug({ socketId: socket.id, message: msg.message }, "Message received");
            const messageWithTimestamp: ChatMessage = {
                ...msg,
                timestamp: new Date()
            };
            io.emit("chat message", messageWithTimestamp);
        });

        
        // Handle disconnect event
        socket.on("disconnect", () => {
            wsLogger.info({ socketId: socket.id }, "User disconnected");
        });
    });

    return { server, io };
}
