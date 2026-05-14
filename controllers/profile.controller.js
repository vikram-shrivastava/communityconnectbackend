import mongoose from "mongoose"; // Make sure to add this at the very top of the file!
import { Profile } from "../models/profile.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";

// ==========================================
// 1. CREATE PROFILE (General Setup)
// ==========================================
export const createProfile = asynchandler(async (req, res) => {
    const userId = req.user._id;

    // Check if profile already exists
    const existingProfile = await Profile.findOne({ user: userId });
    if (existingProfile) {
        throw new handleerror(400, "Profile already exists. Please use update instead.");
    }

    const {
        fullName,
        bio,
        profilePicture,
        currentCity,
        gender,
        employmentStatus,
        customEmploymentStatus,
        designation,
        companyName
    } = req.body;

    if (!fullName) {
        throw new handleerror(400, "Full Name is required to create a profile.");
    }

    const profile = await Profile.create({
        user: userId,
        fullName,
        bio,
        profilePicture,
        currentCity,
        gender,
        employmentStatus,
        customEmploymentStatus,
        designation,
        companyName
    });

    return res.status(201).json(
        new handleresponse(201, profile, "Profile created successfully")
    );
});

// ==========================================
// 2. GET MY PROFILE
// ==========================================
export const getMyProfile = asynchandler(async (req, res) => {
    console.log("🔍 Looking for profile for User ID:", req.user._id);

    // BULLETPROOF FIX: Force Mongoose to treat this as a proper ObjectId
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const profile = await Profile.findOne({ user: userId })
        .populate("user", "email contactNumber plan status isVerified"); 

    if (!profile) {
        console.log("❌ Profile NOT found in the database for this user!");
        throw new handleerror(404, "Profile not found. Please set up your profile.");
    }

    console.log("✅ Profile found! Profile ID:", profile._id);
    
    return res.status(200).json(
        new handleresponse(200, profile, "Profile fetched successfully")
    );
});

// ==========================================
// 3. UPDATE GENERAL PROFILE
// ==========================================
export const updateGeneralProfile = asynchandler(async (req, res) => {
    const {
        fullName, bio, profilePicture, currentCity, 
        gender, employmentStatus, designation, companyName
    } = req.body;

    // BULLETPROOF FIX: Force Mongoose to treat this as a proper ObjectId
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
        throw new handleerror(404, "Profile not found");
    }

    // Update only provided fields
    if (fullName) profile.fullName = fullName;
    if (bio) profile.bio = bio;
    if (profilePicture) profile.profilePicture = profilePicture;
    if (currentCity) profile.currentCity = currentCity;
    if (gender) profile.gender = gender;
    if (employmentStatus) profile.employmentStatus = employmentStatus;
    if (designation) profile.designation = designation;
    if (companyName) profile.companyName = companyName;

    await profile.save();

    return res.status(200).json(
        new handleresponse(200, profile, "General profile updated successfully")
    );
});

// ==========================================
// 4. UPDATE MATRIMONY DATA
// ==========================================
export const updateMatrimonyProfile = asynchandler(async (req, res) => {
    // Only users with the matrimony plan should access this (Best enforced in a middleware, but good to double check)
    if (req.user.plan !== "matrimony" && req.user.role !== "admin") {
        throw new handleerror(403, "Upgrade to the Matrimony plan to update these details.");
    }

    const { matrimonyData } = req.body;
    if (!matrimonyData) {
        throw new handleerror(400, "No matrimony data provided");
    }

    // BULLETPROOF FIX: Force Mongoose to treat this as a proper ObjectId
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const profile = await Profile.findOne({ user: userId });
    if (!profile) throw new handleerror(404, "Profile not found");

    // Initialize matrimonyData if it doesn't exist yet
    if (!profile.matrimonyData) {
        profile.matrimonyData = {};
    }

    // Safely merge root matrimony fields
    const rootFields = ['dob', 'heightCm', 'hobbies', 'aboutFamily', 'annualIncome', 'education', 'isPublic'];
    rootFields.forEach(field => {
        if (matrimonyData[field] !== undefined) {
            profile.matrimonyData[field] = matrimonyData[field];
        }
    });

    // Handle Photos Array (Replace entirely or push? Usually better to replace with current state from frontend)
    if (matrimonyData.matrimonyPhotos && Array.isArray(matrimonyData.matrimonyPhotos)) {
        profile.matrimonyData.matrimonyPhotos = matrimonyData.matrimonyPhotos;
    }

    // Safely merge deeply nested Partner Preferences
    if (matrimonyData.partnerPreferences) {
        if (!profile.matrimonyData.partnerPreferences) {
            profile.matrimonyData.partnerPreferences = {};
        }
        
        const prefFields = [
            'ageRange', 'heightRangeCm', 'hobbies', 'familyType', 
            'skinTone', 'motherTongue', 'location', 'education', 
            'employmentStatus', 'incomeRange'
        ];

        prefFields.forEach(field => {
            if (matrimonyData.partnerPreferences[field] !== undefined) {
                profile.matrimonyData.partnerPreferences[field] = matrimonyData.partnerPreferences[field];
            }
        });
    }

    // Logic: Auto-mark as completed if critical fields exist
    const mData = profile.matrimonyData;
    if (mData.dob && mData.heightCm && mData.education && mData.matrimonyPhotos?.length > 0) {
        profile.matrimonyData.isCompleted = true;
    } else {
        profile.matrimonyData.isCompleted = false;
    }

    await profile.save();

    return res.status(200).json(
        new handleresponse(200, profile, "Matrimony profile updated successfully")
    );
});

// ==========================================
// 5. DELETE PROFILE
// ==========================================
export const deleteProfile = asynchandler(async (req, res) => {
    // BULLETPROOF FIX: Force Mongoose to treat this as a proper ObjectId
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const profile = await Profile.findOneAndDelete({ user: userId });

    if (!profile) {
        throw new handleerror(404, "Profile not found");
    }

    // NOTE: This only deletes the Profile. The User account still exists. 
    // If you want to delete the whole account, you must also delete the User and their Posts.

    return res.status(200).json(
        new handleresponse(200, null, "Profile deleted successfully")
    );
});

// ==========================================
// 6. GET USER PROFILE (By ID for public viewing)
// ==========================================
export const getUserProfile = asynchandler(async (req, res) => {
    const { userId } = req.params;

    // BULLETPROOF FIX: Force Mongoose to treat this as a proper ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const profile = await Profile.findOne({ user: userObjectId })
        .populate("user", "name isVerified plan status"); // Exclude email and phone for privacy

    if (!profile) {
        throw new handleerror(404, "Profile not found");
    }

    // Convert to standard object to manipulate it safely
    const sanitizedProfile = profile.toObject();

    // Privacy Protection: Remove their private matchmaking preferences before sending to frontend
    if (sanitizedProfile.matrimonyData?.partnerPreferences) {
        delete sanitizedProfile.matrimonyData.partnerPreferences;
    }

    return res.status(200).json(
        new handleresponse(200, sanitizedProfile, "User profile fetched successfully")
    );
});

// ==========================================
// 7. GET TOTAL MEMBERS COUNT
// ==========================================
export const getTotalMembers = asynchandler(async (req, res) => {
    // Count all profile documents to see how many people have joined
    const count = await Profile.countDocuments();

    return res.status(200).json(
        new handleresponse(200, { totalMembers: count }, "Total members fetched successfully")
    );
});

// ==========================================
// 8. GET MEMBER DIRECTORY (Public Profiles)
// ==========================================
export const getMemberDirectory = asynchandler(async (req, res) => {
    // Fetch all profiles, populate the user verification status, and sort by newest
    const profiles = await Profile.find()
        .populate("user", "isVerified status")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new handleresponse(200, profiles, "Member directory fetched successfully")
    );
});