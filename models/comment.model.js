import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema({
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxLength: 280 },
}, { timestamps: true });

export const Comment = mongoose.model("Comment", commentSchema);