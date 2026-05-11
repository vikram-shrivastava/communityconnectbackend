import { Message } from "../models/message.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleresponse } from "../utils/apiResponse.js";

export const getChatHistory = asynchandler(async (req, res) => {
    const { userId } = req.params; // The ID of the person they are chatting with
    const myId = req.user._id;     // The currently logged-in user

    // Find all messages where the current user is either the sender or receiver
    const messages = await Message.find({
        $or: [
            { sender: myId, receiver: userId },
            { sender: userId, receiver: myId }
        ]
    }).sort({ createdAt: 1 }); // Sort oldest to newest for standard chat flow

    return res.status(200).json(
        new handleresponse(200, messages, "Chat history fetched successfully")
    );
});