import { Schema, model } from "mongoose";

const postSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    caption: {
        type: String,
        trim: true,
        maxLength: [500, "Caption cannot exceed 500 characters"],
        required: true
    },
    media: [
        {
            url: { type: String, required: true },
            type: { type: String, enum: ["image", "video"], default: "image" },
            publicId: String 
        }
    ],
    likesCount: {
        type: Number,
        default: 0
    },
    recentLikes: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    commentsCount: {
        type: Number,
        default: 0
    },
    isSponsored: {
        type: Boolean,
        default: false,
        index: true
    },
    adLink: String,
    location: String
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ isSponsored: 1, createdAt: -1 });

export const Post = model("Post", postSchema);