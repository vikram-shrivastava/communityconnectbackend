import mongoose, { Schema } from "mongoose";

const campaignSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },
    campaignGoal: {
        type: String,
        required: true
    },
    targetAudience: {
        ageRange: {
            min: { type: Number, required: true },
            max: { type: Number, required: true }
        },
        gender: {
            type: String,
            enum: ["male", "female", "all"],
            default: "all"
        },
        interests: [String]
    },
    budget: {
        type: Number,
        required: true,
        min: 0
    },
    durationDays: {
        type: Number,
        required: true,
        min: 1
    },
    // Metrics for Ad Manager Dashboard
    totalImpressions: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    spentBudget: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paymentStatus: { 
        type: String, 
        enum: ["pending", "completed", "failed"], 
        default: "pending" 
    }
}, { timestamps: true });

export const Campaign = mongoose.model("Campaign", campaignSchema);