import User from "../models/users.model.js";
import { Post } from "../models/post.model.js";
import { Profile } from "../models/profile.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";

// ==========================================
// 1. GET ALL USERS (Admin)
// ==========================================
export const getAllUsers = asynchandler(async (req, res) => {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json(new handleresponse(200, users, "All users fetched"));
});

// ==========================================
// 2. BAN / UNBAN USER
// ==========================================
export const toggleBanUser = asynchandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) throw new handleerror(404, "User not found");
    if (user.role === "admin") throw new handleerror(403, "Cannot ban an admin");

    // Toggle between banned and approved
    user.status = user.status === "banned" ? "approved" : "banned";
    await user.save();

    return res.status(200).json(
        new handleresponse(200, { status: user.status }, `User has been ${user.status}`)
    );
});

// ==========================================
// 3. GET ALL POSTS (Admin)
// ==========================================
export const getAllPosts = asynchandler(async (req, res) => {
    const posts = await Post.find()
        .populate("user", "name email status")
        .sort({ createdAt: -1 });

    return res.status(200).json(new handleresponse(200, posts, "All posts fetched"));
});

// ==========================================
// 4. DELETE ANY POST (Admin)
// ==========================================
export const adminDeletePost = asynchandler(async (req, res) => {
    const { postId } = req.params;
    const post = await Post.findByIdAndDelete(postId);
    
    if (!post) throw new handleerror(404, "Post not found");

    return res.status(200).json(new handleresponse(200, null, "Post deleted by admin"));
});

// ==========================================
// 5. GET ALL MATRIMONY PROFILES (Admin)
// ==========================================
export const getAllMatrimonyProfiles = asynchandler(async (req, res) => {
    const profiles = await Profile.find({ "matrimonyData.isCompleted": true })
        .populate("user", "name email status")
        .sort({ createdAt: -1 });

    return res.status(200).json(new handleresponse(200, profiles, "Matrimony profiles fetched"));
});

// ==========================================
// APPROVE WAITLISTED USER
// ==========================================
export const approveUser = asynchandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) throw new handleerror(404, "User not found");
    if (user.status === "approved" || user.status === "active") {
        throw new handleerror(400, "User is already approved.");
    }

    // Change status to approved
    user.status = "approved";
    
    // Optional: Generate an invite code for them if they don't have one
    // user.myInviteCode = await createInviteCode(); 
    
    await user.save();

    return res.status(200).json(
        new handleresponse(200, { status: user.status }, "User approved successfully! They can now log in.")
    );
});