import mongoose, { Schema } from "mongoose";

const interactionSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending"
    },
    isMutual: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

interactionSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export const MatrimonyInteraction = mongoose.model("MatrimonyInteraction", interactionSchema);