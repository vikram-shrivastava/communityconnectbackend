import { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minLength: [3, "Name must be at least 3 characters"],
        maxLength: [50, "Name cannot exceed 50 characters"]
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        required: [true, "Email is required"],
        lowercase: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Please provide a valid email"]
    },
    contactNumber: {
        type: String,
        unique: true, // Crucial for unique login
        trim: true,
        index: true, // Fast lookup
        sparse: true,
        match: [/^\d{10}$/, "Please provide a valid 10-digit number"]
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minLength: [6, "Password must be at least 6 characters"],
        select: false
    },
    status: {
        type: String,
        enum: ["waitlist", "approved", "active", "banned"],
        required: true,
        default: "waitlist"
    },
    plan: {
        type: String,
        enum: ["free", "matrimony"],
        default: "free"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verifyCode: {
        type: String
    },
    myInviteCode: {
        type: String,
        unique: true,
        sparse: true, // Only create index for documents that have this field
        index: true
    },
    invitedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    role: {
        type: String,
        enum: ["user", "admin", "moderator"],
        default: "user"
    },
    refreshToken: {
        type: String,
        select: false // Keep this private
    }
}, { timestamps: true });

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return ;
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Error processing password");
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { _id: this._id, role: this.role, plan: this.plan }, 
        process.env.ACCESS_TOKEN_SECRET, 
        { expiresIn: "15m" }
    );
};

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { _id: this._id }, 
        process.env.REFRESH_TOKEN_SECRET, 
        { expiresIn: "7d" }
    );
};

const User = model("User", userSchema);
export default User;