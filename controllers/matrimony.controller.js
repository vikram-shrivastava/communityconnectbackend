import { Profile } from "../models/profile.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";
import { MatrimonyInteraction } from "../models/matrimonyInteraction.js";
// ==========================================
// 1. THE MATCHMAKING ENGINE (Get Feed)
// ==========================================
export const getMatrimonyFeed = asynchandler(async (req, res) => {
    const currentUserId = req.user._id;
    const isAdmin = req.user.role === "admin" || req.user.email === "admin@admin.com";

    // 1. Fetch current user's profile
    const currentUserProfile = await Profile.findOne({ user: currentUserId });

    // Normal users MUST have a completed matrimony profile to view the feed
    if (!isAdmin && (!currentUserProfile || !currentUserProfile.matrimonyData?.isCompleted)) {
        throw new handleerror(400, "Please complete your matrimony profile to see matches.");
    }

    // Base query: Don't show the current user, only show completed & public profiles
    const query = {
        user: { $ne: currentUserId },
        "matrimonyData.isCompleted": true,
        "matrimonyData.isPublic": true,
    };

    // 2. Apply Strict Matchmaking Logic ONLY for Normal Users
    if (!isAdmin) {
        const prefs = currentUserProfile.matrimonyData.partnerPreferences;
        const targetGender = currentUserProfile.gender === "male" ? "female" : "male";

        // Find users we have ALREADY interacted with so we don't show them again
        const pastInteractions = await MatrimonyInteraction.find({ sender: currentUserId });
        const interactedUserIds = pastInteractions.map(interaction => interaction.receiver);
        
        query.user.$nin = interactedUserIds;
        query.gender = targetGender;

        // --- Apply Filters based on Preferences ---
        if (prefs) {
            if (prefs.ageRange?.min && prefs.ageRange?.max) {
                const today = new Date();
                const minDate = new Date(today.getFullYear() - prefs.ageRange.max, today.getMonth(), today.getDate());
                const maxDate = new Date(today.getFullYear() - prefs.ageRange.min, today.getMonth(), today.getDate());
                query["matrimonyData.dob"] = { $gte: minDate, $lte: maxDate };
            }
            if (prefs.heightRangeCm?.min && prefs.heightRangeCm?.max) {
                query["matrimonyData.heightCm"] = { 
                    $gte: prefs.heightRangeCm.min, 
                    $lte: prefs.heightRangeCm.max 
                };
            }
            if (prefs.location && prefs.location.length > 0) {
                query.currentCity = { $in: prefs.location };
            }
            if (prefs.motherTongue) {
                query["matrimonyData.partnerPreferences.motherTongue"] = prefs.motherTongue;
            }
            if (prefs.employmentStatus && prefs.employmentStatus.length > 0) {
                query.employmentStatus = { $in: prefs.employmentStatus };
            }
        }
    }

    // 4. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 5. Execute Query
    const matches = await Profile.find(query)
        .populate("user", "name isVerified") 
        .select("-matrimonyData.partnerPreferences") 
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new handleresponse(200, { matches, page, limit }, "Matches fetched successfully")
    );
});

// ==========================================
// 2. EXPRESS INTEREST ("Swipe Right")
// ==========================================
export const expressInterest = asynchandler(async (req, res) => {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (senderId.toString() === receiverId) {
        throw new handleerror(400, "You cannot send an interest to yourself.");
    }

    // Check if interaction already exists to prevent spam
    const existingInteraction = await MatrimonyInteraction.findOne({
        sender: senderId,
        receiver: receiverId
    });

    if (existingInteraction) {
        throw new handleerror(400, "You have already interacted with this profile.");
    }

    // Check if the RECEIVER already liked the SENDER (Mutual Match Scenario)
    const reverseInteraction = await MatrimonyInteraction.findOne({
        sender: receiverId,
        receiver: senderId,
        status: "pending"
    });

    if (reverseInteraction) {
        // IT'S A MATCH! Update the reverse interaction to accepted
        reverseInteraction.status = "accepted";
        reverseInteraction.isMutual = true;
        await reverseInteraction.save();

        // Create the current interaction as accepted and mutual too
        await MatrimonyInteraction.create({
            sender: senderId,
            receiver: receiverId,
            status: "accepted",
            isMutual: true
        });

        // TODO: Trigger Push Notification to both users here

        return res.status(200).json(
            new handleresponse(200, { isMatch: true }, "It's a mutual match!")
        );
    }

    // Normal Scenario: Create pending request
    await MatrimonyInteraction.create({
        sender: senderId,
        receiver: receiverId,
        status: "pending"
    });

    return res.status(201).json(
        new handleresponse(201, { isMatch: false }, "Interest sent successfully")
    );
});

// ==========================================
// 3. PASS / DECLINE ("Swipe Left")
// ==========================================
export const passProfile = asynchandler(async (req, res) => {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    // We save a "declined" interaction so the feed engine knows never to show them again
    await MatrimonyInteraction.findOneAndUpdate(
        { sender: senderId, receiver: receiverId },
        { status: "declined" },
        { upsert: true, new: true } // Creates it if it doesn't exist
    );

    return res.status(200).json(
        new handleresponse(200, null, "Profile passed")
    );
});

// ==========================================
// 4. GET PENDING REQUESTS (Who liked me)
// ==========================================
export const getPendingRequests = asynchandler(async (req, res) => {
    const myUserId = req.user._id;

    // Find interactions where I am the receiver and status is pending
    const requests = await MatrimonyInteraction.find({
        receiver: myUserId,
        status: "pending"
    })
    .populate({
        path: "sender",
        select: "name",
        // Pull the sender's profile data to show on the request card
        populate: {
            path: "profile", // Note: Requires virtuals setup on User schema or direct Profile query
            model: "Profile",
            select: "fullName profilePicture currentCity matrimonyData.education"
        }
    })
    .sort({ createdAt: -1 });

    return res.status(200).json(
        new handleresponse(200, requests, "Pending requests fetched")
    );
});

// ==========================================
// 5. GET MUTUAL MATCHES (My Connections)
// ==========================================
export const getMutualMatches = asynchandler(async (req, res) => {
    const myUserId = req.user._id;

    const matches = await MatrimonyInteraction.find({
        sender: myUserId,
        isMutual: true
    })
    .populate({
        path: "receiver",
        select: "name email contactNumber", // Now you can reveal contact info since they matched!
        populate: {
            path: "profile",
            model: "Profile",
            select: "fullName profilePicture matrimonyData.matrimonyPhotos"
        }
    })
    .sort({ updatedAt: -1 });

    return res.status(200).json(
        new handleresponse(200, matches, "Mutual matches fetched")
    );
});