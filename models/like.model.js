import mongoose, { Schema } from "mongoose";
const likeSchema = new Schema({
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true });
// A user can only like a specific post once
likeSchema.index({ post: 1, user: 1 }, { unique: true });
export const Like = mongoose.model("Like", likeSchema);