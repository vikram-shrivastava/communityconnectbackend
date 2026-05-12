import User from "../models/users.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";

// ==========================================
// 1. GET PENDING WAITLIST USERS
// ==========================================
export const getWaitlist = asynchandler(async (req, res) => {
    // Fetch users who are currently on the waitlist, sorted by oldest first
    const waitlist = await User.find({ status: "waitlist" })
        .select("name email status createdAt")
        .sort({ createdAt: 1 });

    return res.status(200).json(
        new handleresponse(200, waitlist, "Waitlist fetched successfully")
    );
});

// ==========================================
// 2. APPROVE WAITLIST USER
// ==========================================
export const approveUser = asynchandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
        throw new handleerror(404, "User not found");
    }

    if (user.status !== "waitlist") {
        throw new handleerror(400, "This user is not on the waitlist");
    }

    // Change status and generate an invite code for them if they don't have one
    user.status = "approved"; // Or "active" depending on your schema
    await user.save();

    // Optional: Send them an approval email here

    return res.status(200).json(
        new handleresponse(200, null, "Member approved successfully")
    );
});