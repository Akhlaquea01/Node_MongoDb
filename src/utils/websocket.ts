import { Server, Socket } from "socket.io";
import http from "http";
import { Express } from "express";
import logger from "./logger.js";

interface ChatMessage {
    message: string;
    timestamp?: Date;
    userId?: string;
    username?: string;
}

const wsLogger = logger.child({ module: 'websocket' });

export function setupWebSocketServer(app: Express): { server: http.Server; io: Server } {
    const server = http.createServer(app);

    // Configure CORS for Angular and other clients
    // Default to Angular dev server (port 4200), but allow override via environment variable
    // You can set SOCKET_ORIGIN in .env file, e.g., SOCKET_ORIGIN=http://localhost:4200,http://localhost:3000
    const allowedOrigins = process.env.SOCKET_ORIGIN 
        ? process.env.SOCKET_ORIGIN.split(',').map(origin => origin.trim())
        : ["http://localhost:4200", "http://localhost:3000"]; // Angular default port 4200, React default 3000

    const io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' 
                ? allowedOrigins 
                : allowedOrigins.length === 1 && allowedOrigins[0] === "*"
                    ? "*"
                    : allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization"]
        },
        transports: ['websocket', 'polling'], // Support both WebSocket and polling fallback
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on("connection", (socket: Socket) => {
        wsLogger.info({ 
            socketId: socket.id,
            clientOrigin: socket.handshake.headers.origin,
            transport: socket.conn.transport.name
        }, "✅ User connected");

        // Handle chat message event
        socket.on("chat message", (msg: string | ChatMessage) => {
            wsLogger.info({ 
                socketId: socket.id, 
                message: typeof msg === 'string' ? msg : msg.message,
                userId: typeof msg === 'object' ? msg.userId : undefined
            }, "📨 Message received from client");

            // Normalize message format - preserve userId from client
            const chatMessage: ChatMessage = {
                message: typeof msg === 'string' ? msg : (msg.message || ''),
                userId: typeof msg === 'object' && msg.userId ? msg.userId : socket.id, // Use socket.id as fallback
                timestamp: new Date(),
                ...(typeof msg === 'object' && msg.username ? { username: msg.username } : {})
            };

            // ✅ OPTION 1: Broadcast to ALL clients (including sender)
            // This sends the message to everyone, including the person who sent it
            // Use this if you want the server to be the single source of truth
            // The Angular client should handle duplicate prevention if it already shows the message locally
            io.emit("chat message", chatMessage);
            wsLogger.debug({ 
                socketId: socket.id,
                userId: chatMessage.userId,
                broadcastType: "all_clients",
                totalClients: io.sockets.sockets.size
            }, "📤 Message broadcasted to all clients");

            // ✅ OPTION 2: Broadcast to ALL clients EXCEPT sender
            // Uncomment the line below and comment out the io.emit() above to use this option
            // Use this if the client already shows the message locally (optimistic update)
            // and you want to prevent the sender from seeing their own message twice
            // socket.broadcast.emit("chat message", chatMessage);
            // wsLogger.debug({ 
            //     socketId: socket.id,
            //     userId: chatMessage.userId,
            //     broadcastType: "all_except_sender",
            //     totalClients: io.sockets.sockets.size
            // }, "📤 Message broadcasted to all clients (except sender)");
        });

        // Handle typing indicator (optional feature)
        socket.on("typing", (data: { username?: string; isTyping: boolean }) => {
            socket.broadcast.emit("typing", {
                ...data,
                socketId: socket.id
            });
        });

        // Handle user join notification (optional feature)
        socket.on("user joined", (data: { username?: string; userId?: string }) => {
            wsLogger.info({ socketId: socket.id, username: data.username }, "👤 User joined");
            socket.broadcast.emit("user joined", {
                ...data,
                socketId: socket.id,
                timestamp: new Date()
            });
        });

        // Handle user leave notification (optional feature)
        socket.on("user left", (data: { username?: string; userId?: string }) => {
            wsLogger.info({ socketId: socket.id, username: data.username }, "👋 User left");
            socket.broadcast.emit("user left", {
                ...data,
                socketId: socket.id,
                timestamp: new Date()
            });
        });

        // Handle disconnect event
        socket.on("disconnect", (reason: string) => {
            wsLogger.info({ 
                socketId: socket.id,
                reason,
                totalClients: io.sockets.sockets.size - 1 // -1 because this socket is about to disconnect
            }, "❌ User disconnected");
        });

        // Handle connection errors
        socket.on("error", (error: Error) => {
            wsLogger.error({ 
                socketId: socket.id,
                error: error.message,
                stack: error.stack
            }, "❌ Socket error");
        });
    });

    // Server-level error handling
    io.on("connection_error", (error: Error) => {
        wsLogger.error({ 
            error: error.message,
            stack: error.stack
        }, "❌ Socket.IO connection error");
    });

    wsLogger.info({ 
        allowedOrigins: allowedOrigins.length === 1 && allowedOrigins[0] === "*" ? "all" : allowedOrigins,
        transports: ['websocket', 'polling']
    }, "🚀 WebSocket server initialized");

    return { server, io };
}
