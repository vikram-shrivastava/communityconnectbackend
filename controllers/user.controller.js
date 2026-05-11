import User from "../models/users.model.js";
import { Counter } from "../models/counter.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";
import { sendVerificationEmail } from "../utils/sendVerificationemail.js";
import jwt from "jsonwebtoken";

// Helper Function (Internal use only, no req/res)
// Helper Function (Internal use only, no req/res)
const createInviteCode = async () => {
    // 1. Try to find and increment the existing counter
    let counter = await Counter.findOneAndUpdate(
        { id: "inviteCode" },
        { $inc: { seq: 1 } },
        { new: true } // Notice we removed upsert: true here!
    );

    // 2. If it doesn't exist yet, create it with your exact starting number
    if (!counter) {
        counter = await Counter.create({ 
            id: "inviteCode", 
            seq: 131204
        });
    }

    // 3. Convert to Base36 string and return
    const code = counter.seq.toString(36).toUpperCase();
    return `KAY${code}`;
};

export const registerUser = asynchandler(async (req, res) => {
    console.log("🔥 REGISTER ENDPOINT HIT WITH DATA:", req.body); // ADD THIS
    const { name, email, password, inviteCode } = req.body;

    if (!name || !password || !email) {
        throw new handleerror(400, "Name, email and password are required");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new handleerror(400, "Email already in use");
    }

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Prepare User Object
    const userData = {
        name,
        email,
        password,
        verifyCode,
        status: "waitlist" // Default status
    };

    // If invite code provided, verify and approve
    if (inviteCode) {
        const inviter = await User.findOne({ myInviteCode: inviteCode.toUpperCase() });
        if (inviter) {
            userData.invitedBy = inviter._id;
            userData.status = "approved";
            userData.myInviteCode = await createInviteCode(); 
        }
    }

    const user = await User.create(userData);

    // Send email AFTER creation so we don't send emails if DB fails
    const emailResponse = await sendVerificationEmail(email, name, verifyCode);
    if (!emailResponse.success) {
        // Optional: Delete user if email fails, or just log it
        console.error("Email failed:", emailResponse.message);
        const deletedUser=await User.findByIdAndDelete(user._id);
        throw new handleerror(500, "Registration failed. Please try again.");
    }

    const createdUser = await User.findById(user._id).select("-password -verifyCode");

    return res.status(201).json(
        new handleresponse(201, createdUser, "User registered. Please verify your email.")
    );
});

export const verifyUser = asynchandler(async (req, res) => {
    const { email, verifyCode } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new handleerror(404, "User not found");

    if (user.verifyCode !== verifyCode) {
        throw new handleerror(400, "Invalid verification code");
    }

    user.isVerified = true;
    user.verifyCode = undefined;
    await user.save();

    return res.status(200).json(
        new handleresponse(200, { isVerified: true }, "Account verified successfully")
    );
});

// --- NEW CONTROLLER: Share Invite Code ---
export const getMyInviteLink = asynchandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user.status !== "active" && user.status !== "approved") {
        throw new handleerror(403, "Only approved users can share invite codes");
    }

    if (!user.myInviteCode) {
        // Generate one if they were approved manually by admin and don't have one
        user.myInviteCode = await createInviteCode();
        await user.save();
    }

    const shareData = {
        inviteCode: user.myInviteCode,
        message: `Join our exclusive community! Use my code ${user.myInviteCode} to skip the waitlist.`,
        url: `https://kayasthconnect.com/register?code=${user.myInviteCode}`
    };

    return res.status(200).json(
        new handleresponse(200, shareData, "Invite code retrieved successfully")
    );
});

export const loginUser = asynchandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new handleerror(400, "Email and password are required");
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        throw new handleerror(404, "User not found");
    }
    if (user.status === "waitlist") {
        // Return a 403, but explicitly attach the userId and status so the frontend can route them
        return res.status(403).json(
            new handleresponse(403, { 
                status: "waitlist", 
                userId: user._id 
            }, "Your account is still on the waitlist.")
        );
    }
    if (user.status === "banned") {
        throw new handleerror(403, "Your account has been banned. Contact support for more info.");
    }
    if (!user.isVerified) {
        throw new handleerror(403, "Please verify your email before logging in.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new handleerror(400, "Invalid credentials");
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken(); // Save to variable first

    // Save refresh token to DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // Skip validation just to save token

    const userwithoutPassword = await User.findById(user._id).select("-password -verifyCode -refreshToken");

    // CRITICAL: Cookie options for security
    const cookieOptions = {
        httpOnly: true, // Prevents XSS attacks (frontend JS can't read the cookie)
        secure: process.env.NODE_ENV === "production", // Must be true in production (HTTPS)
        sameSite: "strict"
    };

    // Send cookies AND json response
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new handleresponse(
                200, 
                { user: userwithoutPassword, accessToken, refreshToken }, 
                "Login successful"
            )
        );
});


export const refreshAccessToken = asynchandler(async (req, res) => {
    // 1. Get the refresh token from cookies OR from the request body
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new handleerror(401, "Unauthorized request: No refresh token found");
    }

    try {
        // 2. Verify the token using your secret
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        // 3. Find user and explicitly select the refreshToken field
        const user = await User.findById(decodedToken._id).select("+refreshToken");

        if (!user) {
            throw new handleerror(401, "Invalid refresh token: User not found");
        }

        // 4. Security Check: Does the incoming token match the one in the database?
        if (incomingRefreshToken !== user.refreshToken) {
            throw new handleerror(401, "Refresh token is expired or has already been used");
        }

        // 5. Generate NEW tokens (Token Rotation)
        const newAccessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        // 6. Save the new refresh token to the database
        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        // 7. Cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        };

        // 8. Send the new tokens to the client
        return res
            .status(200)
            .cookie("accessToken", newAccessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new handleresponse(
                    200,
                    { accessToken: newAccessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully"
                )
            );

    } catch (error) {
        throw new handleerror(401, error?.message || "Invalid refresh token");
    }
});

export const logoutUser = asynchandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new handleerror(404, "User not found");
    }
    user.refreshToken = null; // Invalidate the refresh token in the database
    await user.save({ validateBeforeSave: false });
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json(new handleresponse(200, null, "Logged out successfully"));
});

