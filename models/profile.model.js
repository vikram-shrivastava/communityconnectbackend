import mongoose, { Schema } from "mongoose";

const profileSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    bio: String,
    profilePicture: String, // Main app profile pic
    currentCity: { type: String, trim: true, index: true },
    gender: { type: String, enum: ["male", "female", "other"], index: true },
    dob: Date,
    // --- Matrimony Specific Data ---
    matrimonyData: {
        // FIX: Store height as Number (centimeters) for math queries
        heightCm: { type: Number }, 
        hobbies: [String],
        aboutFamily: String,
        // Separate photos for matrimony to keep it professional
        matrimonyPhotos: [{
            url: { type: String, required: true },
            publicId: String,
            isMain: { type: Boolean, default: false } 
        }],
        
        // FIX: Added Annual Income back
        annualIncome: { type: String },
        education: String,
        isPublic: { type: Boolean, default: true },
        isCompleted: { type: Boolean, default: false },

        partnerPreferences: {
            ageRange: {
                min: { type: Number, min: 18, max: 100 },
                max: { type: Number, min: 18, max: 100 }
            },
            // FIX: Height range uses Numbers (cm)
            heightRangeCm: {
                min: Number, 
                max: Number
            },
            hobbies: [String],
            familyType: {
                type: String,
                enum: ["joint", "nuclear", "other"]
            },
            skinTone: { type: String, enum: ["fair", "wheatish", "dark"] },
            motherTongue: String,
            location: [String],
            // FIX: Made these arrays so users can select multiple preferences
            education: [String], 
            employmentStatus: [{
                type: String,
                enum: ["employed", "unemployed", "business"]
            }],
            incomeRange: [String] // e.g. ["5-10LPA", "10-15LPA"]
        }
    },

    // --- Professional Info (For Feed / Bio) ---
    employmentStatus: {
        type: String,
        enum: ["employed", "unemployed", "student", "freelancer", "business","housewife", "retired","other"]
    },
    customEmploymentStatus:{
        type: String,
        trim: true,
        required: function() {
            return this.employmentStatus === "other";
        },
        maxlength: 50
    },
    designation: String,
    companyName: String,
}, { timestamps: true });

// --- CRITICAL COMPOUND INDEX FOR MATRIMONY MATCHING ---
// When querying matrimony profiles, you will almost always filter by gender, completion status, and public visibility.
profileSchema.index({ 
    gender: 1, 
    "matrimonyData.isCompleted": 1, 
    "matrimonyData.isPublic": 1 
});

export const Profile = mongoose.model("Profile", profileSchema);