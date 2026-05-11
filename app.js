import express from 'express';
import http from 'http'; // 1. Import the native HTTP module
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import errorHandler from './middleware/errorhandler.middleware.js';
import rateLimit from 'express-rate-limit';
import rootRouter from './routes/index.js';
import { Server } from "socket.io";
import { Message } from "./models/message.model.js";

const app = express();
app.set("trust proxy", 1);
// 2. Explicitly create the HTTP server using your Express app
const server = http.createServer(app);

// 3. Attach Socket.io to the newly created HTTP server
const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN } // Restrict this to your frontend URL in production
});

// We use a Map to keep track of which user is connected to which socket
const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // 1. When a user opens the app, they "join" with their User ID
    socket.on("join", (userId) => {
        onlineUsers.set(userId, socket.id);
    });

    // 2. Listen for outgoing messages
    socket.on("sendMessage", async (data) => {
        const { senderId, receiverId, content } = data;

        // Save the message to MongoDB instantly
        const savedMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            content: content
        });

        // Check if the receiver is currently online
        const receiverSocketId = onlineUsers.get(receiverId);
        
        if (receiverSocketId) {
            // If they are online, push the message to their phone instantly
            io.to(receiverSocketId).emit("receiveMessage", savedMessage);
        }
    });

    // 3. Handle Disconnects
    socket.on("disconnect", () => {
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }
    });
});

app.set("trust proxy", true);
app.use(cors({
    // Remember to update the Resume Ranker domain to your new Kayasth Connect domain before launch
    origin: [process.env.CORS_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, 
    legacyHeaders: false, 
});

// app.use(globalLimiter);
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.json({ limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Sample route
app.get('/', (req, res) => {
    res.send('Welcome to the Kayasth Connect backend server!');
});

// Import routes here
app.use("/api/v1", rootRouter);
app.use(errorHandler);

// 4. Export BOTH the app and the server
export { app, server };