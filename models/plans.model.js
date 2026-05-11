import mongoose, { Schema } from "mongoose";

const planSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        enum: ["free", "matrimony"] 
    },
    description: {
        type: String,
        trim: true,
        maxLength: [500, "Description cannot exceed 500 characters"]
    },
    features: [String], // e.g. ["Unlimited Swipes", "Ad Posting"]
    price: {
        type: Number,
        required: true,
        min: [0, "Price cannot be negative"]
    }
}, { timestamps: true });

export const Plan = mongoose.model("Plan", planSchema);