import { Server, Socket } from "socket.io";
import http from "http";
import { Express } from "express";

interface ChatMessage {
    message: string;
    timestamp?: Date;
}

interface PingMessage {
    communityId: string;
    message: string;
}

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
        console.log(`User connected with ID: ${socket.id}`);

        // Handle chat message event
        socket.on("chat message", (msg: ChatMessage) => {
            console.log(`Message received from ${socket.id}: ${msg.message}`);
            const messageWithTimestamp: ChatMessage = {
                ...msg,
                timestamp: new Date()
            };
            io.emit("chat message", messageWithTimestamp);
        });

        socket.on('pingCommunity', (data: PingMessage) => {
            const { communityId, message } = data;
            console.log(`Ping received for community ${communityId} from ${socket.id}`);
            socket.broadcast.to(communityId).emit('ping', message);
        });
        
        // Handle disconnect event
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    return { server, io };
}
