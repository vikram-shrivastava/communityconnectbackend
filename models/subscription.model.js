import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true // One active subscription per user
    },
    plan: {
        type: Schema.Types.ObjectId,
        ref: "Plan",
        required: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "active", "inactive", "cancelled"],
        default: "pending"
    },
    // Add these to your subscriptionSchema
    razorpayOrderId: {
        type: String,
        required: true, // Created as soon as the user clicks "Pay"
        unique: true
    },
    razorpayPaymentId: {
        type: String, // Filled after successful payment
        unique: true,
        sparse: true // Allows null until payment is done
    },
    razorpaySignature: {
        type: String, // Crucial for security verification
        select: false // You rarely need to query this
    },
    receiptNumber: {
        type: String, // Your internal tracking ID
        unique: true
    }}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);