import { Campaign } from "../models/campaign.model.js";
import { Post } from "../models/post.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";

// ==========================================
// 1. INITIALIZE AD CAMPAIGN (Pre-Payment)
// ==========================================
export const initializeCampaign = asynchandler(async (req, res) => {
    const {
        caption,
        media,
        campaignGoal,
        targetAudience, // { ageRange: { min, max }, gender, interests }
        budget,
        durationDays
    } = req.body;

    if (!targetAudience || !budget || !durationDays) {
        throw new handleerror(400, "Target audience, budget, and duration are required.");
    }

    // 1. Create the underlying "Sponsored Post"
    const sponsoredPost = await Post.create({
        user: req.user._id,
        caption,
        media,
        isSponsored: true // This keeps it out of the organic chronological feed
    });

    // 2. Create the Campaign (Inactive pending payment)
    const campaign = await Campaign.create({
        user: req.user._id,
        post: sponsoredPost._id,
        campaignGoal,
        targetAudience,
        budget,
        durationDays,
        isActive: false // Will be set to true after Razorpay payment succeeds
    });

    // NOTE: In your Razorpay controller, you will generate an order for `budget` amount here
    // and send the Order ID back to the frontend.

    return res.status(201).json(
        new handleresponse(201, campaign, "Campaign draft created. Proceed to payment.")
    );
});

// ==========================================
// 2. GET MY AD DASHBOARD (View Metrics)
// ==========================================
export const getMyCampaigns = asynchandler(async (req, res) => {
    const campaigns = await Campaign.find({ user: req.user._id })
        .populate("post") // Pull the post details to show a preview
        .sort({ createdAt: -1 });

    // Calculate quick stats for the top of the user's dashboard
    const totalSpent = campaigns.reduce((acc, curr) => acc + curr.spentBudget, 0);
    const totalClicks = campaigns.reduce((acc, curr) => acc + curr.totalClicks, 0);
    const totalImpressions = campaigns.reduce((acc, curr) => acc + curr.totalImpressions, 0);

    return res.status(200).json(
        new handleresponse(200, {
            campaigns,
            stats: { totalSpent, totalClicks, totalImpressions }
        }, "Campaign dashboard fetched successfully")
    );
});

// ==========================================
// 3. TOGGLE CAMPAIGN STATUS (Pause / Resume)
// ==========================================
export const toggleCampaignStatus = asynchandler(async (req, res) => {
    const { campaignId } = req.params;

    const campaign = await Campaign.findOne({ _id: campaignId, user: req.user._id });
    
    if (!campaign) {
        throw new handleerror(404, "Campaign not found");
    }

    // Flip the active status (e.g., if they want to pause their ad manually)
    campaign.isActive = !campaign.isActive;
    await campaign.save();

    const statusMessage = campaign.isActive ? "Campaign resumed" : "Campaign paused";

    return res.status(200).json(
        new handleresponse(200, { isActive: campaign.isActive }, statusMessage)
    );
});

// ==========================================
// 4. RECORD AD IMPRESSION (Called by Frontend Feed)
// ==========================================
export const recordAdImpression = asynchandler(async (req, res) => {
    const { campaignId } = req.params;

    // Called silently by the frontend when the ad scrolls into view
    // Using $inc is extremely fast and avoids race conditions
    await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { totalImpressions: 1 } }
    );

    return res.status(200).json(
        new handleresponse(200, null, "Ad impression recorded")
    );
});

// ==========================================
// 5. RECORD AD CLICK (Called by Frontend Feed)
// ==========================================
export const recordAdClick = asynchandler(async (req, res) => {
    const { campaignId } = req.params;

    // Called when a user taps the ad to learn more
    await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { totalClicks: 1 } }
    );

    return res.status(200).json(
        new handleresponse(200, null, "Ad click recorded")
    );
});