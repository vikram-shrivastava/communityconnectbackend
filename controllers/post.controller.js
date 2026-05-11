import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Campaign } from "../models/campaign.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";
import { Profile } from "../models/profile.model.js";
import {calculateAge} from "../utils/helper.js"
// ==========================================
// 1. CREATE A NEW POST
// ==========================================
export const createPost = asynchandler(async (req, res) => {
    const { caption, media, location } = req.body;
    const userId = req.user._id;

    if (!caption) {
        throw new handleerror(400, "Caption is required");
    }

    const newPost = await Post.create({
        user: userId,
        caption,
        media: media || [], // Array of { url, type, publicId }
        location,
        isSponsored: false // Default. Campaigns will create sponsored posts separately
    });

    return res.status(201).json(
        new handleresponse(201, newPost, "Post created successfully")
    );
});

// ==========================================
// 2. GET THE COMMUNITY FEED (With Ads Injected)
// ==========================================
export const getFeed = asynchandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1. Fetch Organic Posts (Normal users)
    const organicPosts = await Post.find({ isSponsored: false })
        .populate("user", "name profilePicture isVerified plan")
        .populate("recentLikes", "name") // Get names of the last 3 people who liked it
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); // .lean() makes it a plain JS object, faster to process

    // 2. Fetch Sponsored Posts (Ads) - pull 2 ads per page
    const userProfile = await Profile.findOne({ user: req.user._id }).select("dob gender");

    // 🌟 FIX 1: Safe Age Fallback. If DOB is missing, default to 25 so ads still appear!
    let userAge = calculateAge(userProfile?.dob);
    if (!userAge || isNaN(userAge)) {
        userAge = 25; 
    }
    const userGender = userProfile?.gender || "all";

    // 2. Fetch Targeted Sponsored Posts (The Recommendation Engine)
    const activeCampaigns = await Campaign.find({
        isActive: true,
        // Match gender (either specific to them, or ads targeting 'all')
        "targetAudience.gender": { $in: [userGender, "all"] },
        // Match age range
        "targetAudience.ageRange.min": { $lte: userAge },
        "targetAudience.ageRange.max": { $gte: userAge }
    })
        .populate({
            path: "post",
            populate: { path: "user", select: "name profilePicture isVerified" }
        })
        .skip((page - 1) * 2) // Paginating the ads
        .limit(2)
        .lean();

    // 🌟 FIX 2: Safely map ads in case the original sponsored post was deleted
    const adPosts = activeCampaigns.map(campaign => {
        if (!campaign.post) return null; // Prevent crashes if post is missing
        return { ...campaign.post, isAd: true, campaignId: campaign._id };
    }).filter(Boolean);

    // 3. Mix them together (Inject an ad after every 4 organic posts)
    let feed = [];
    let adIndex = 0;

    for (let i = 0; i < organicPosts.length; i++) {
        feed.push(organicPosts[i]);
        
        // 🌟 FIX 3: Insert 1 ad for every 4 organic posts, OR if it's the very last organic post!
        if (((i + 1) % 4 === 0 || i === organicPosts.length - 1) && adIndex < adPosts.length) {
            feed.push(adPosts[adIndex]);
            adIndex++;
        }
    }

    // Add any remaining ads to the end (Handles the scenario where organicPosts.length === 0)
    while (adIndex < adPosts.length) {
        feed.push(adPosts[adIndex]);
        adIndex++;
    }

    // 4. (Optional but recommended) Check if the CURRENT user liked these posts
    // This tells the frontend whether to show a red heart or empty heart
    const myLikes = await Like.find({
        user: req.user._id,
        post: { $in: feed.map(p => p._id) }
    });

    const myLikedPostIds = new Set(myLikes.map(like => like.post.toString()));

    feed = feed.map(post => ({
        ...post,
        hasLiked: myLikedPostIds.has(post._id.toString())
    }));

    return res.status(200).json(
        new handleresponse(200, { feed, page }, "Feed fetched successfully")
    );
});

// ==========================================
// 3. TOGGLE LIKE POST
// ==========================================
export const toggleLikePost = asynchandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const existingLike = await Like.findOne({ post: postId, user: userId });

    if (existingLike) {
        // UNLIKE: Remove the like doc, decrement count, pull user from recentLikes
        await existingLike.deleteOne();
        await Post.findByIdAndUpdate(postId, {
            $inc: { likesCount: -1 },
            $pull: { recentLikes: userId }
        });

        return res.status(200).json(new handleresponse(200, { isLiked: false }, "Post unliked"));
    } else {
        // LIKE: Create doc, increment count, push user to recentLikes (Keep max 3)
        await Like.create({ post: postId, user: userId });
        await Post.findByIdAndUpdate(postId, {
            $inc: { likesCount: 1 },
            // $push with $slice keeps the array size strictly at 3
            $push: {
                recentLikes: {
                    $each: [userId],
                    $slice: -3 // Keeps the LAST 3 items pushed
                }
            }
        });

        return res.status(200).json(new handleresponse(200, { isLiked: true }, "Post liked"));
    }
});

// ==========================================
// 4. ADD COMMENT
// ==========================================
export const addComment = asynchandler(async (req, res) => {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || text.trim() === "") {
        throw new handleerror(400, "Comment text is required");
    }

    const post = await Post.findById(postId);
    if (!post) throw new handleerror(404, "Post not found");

    const comment = await Comment.create({
        post: postId,
        user: userId,
        text
    });

    // Increment comment count on the post
    post.commentsCount += 1;
    await post.save();

    return res.status(201).json(
        new handleresponse(201, comment, "Comment added successfully")
    );
});

// ==========================================
// 5. GET COMMENTS FOR A POST
// ==========================================
export const getComments = asynchandler(async (req, res) => {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const comments = await Comment.find({ post: postId })
        .populate("user", "name profilePicture isVerified")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return res.status(200).json(
        new handleresponse(200, { comments, page }, "Comments fetched successfully")
    );
});

// ==========================================
// 6. DELETE POST
// ==========================================
export const deletePost = asynchandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) throw new handleerror(404, "Post not found");

    // Ensure only the owner (or an admin) can delete it
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        throw new handleerror(403, "You are not authorized to delete this post");
    }

    // Clean up associated Likes and Comments to save database space
    await Like.deleteMany({ post: postId });
    await Comment.deleteMany({ post: postId });

    // Delete the actual post
    await post.deleteOne();

    return res.status(200).json(
        new handleresponse(200, null, "Post deleted successfully")
    );
});

export const getUserPosts = asynchandler(async (req, res) => {
    const { userId } = req.params;
    
    // We don't need to populate user details deeply here since it's their own profile
    const posts = await Post.find({ user: userId })
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json(
        new handleresponse(200, posts, "User posts fetched successfully")
    );
});