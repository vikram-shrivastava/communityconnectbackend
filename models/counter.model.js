import mongoose, { Schema } from "mongoose";

const counterSchema = new Schema({
    id: { type: String, required: true, unique: true }, // e.g., "inviteCode"
    seq: { type: Number, default: 131204 } // Your starting point
});

export const Counter = mongoose.model("Counter", counterSchema);