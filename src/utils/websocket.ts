import { Server } from "socket.io";
import http from "http";

export function setupWebSocketServer(app) {
    const server = http.createServer(app);

    // Configure CORS
    const io = new Server(server, {
        cors: {
            origin: process.env.SOCKET_ORIGIN,
            // methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected");

        // Handle chat message event
        socket.on("chat message", (msg) => {
            console.log("message: " + msg);
            io.emit("chat message", msg); // Broadcast message to all connected clients
        });


        socket.on('pingCommunity', ({ communityId, message }) => {
            socket.broadcast.to(communityId).emit('ping', message);
        });
        
        // Handle disconnect event
        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    return { server, io };
}
