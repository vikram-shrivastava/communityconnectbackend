import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/users.model.js";
import {DB_name} from "../constant.js"
dotenv.config();

const seedAdmin = async () => {
    try {
        // Connect to your database
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_name}`);
        console.log("📦 Connected to MongoDB");

        // Check if admin already exists to prevent duplicates
        const existingAdmin = await User.findOne({ email: "admin@admin.com" });
        if (existingAdmin) {
            console.log("⚠️ Admin already exists!");
            process.exit(0);
        }

        // The Admin Document
        const adminDoc = {
            name: "System Admin",
            email: "admin@admin.com",
            contactNumber: "0000000000", // Must be exactly 10 digits to pass your regex
            password: "admin@123456",    // Mongoose will hash this automatically!
            status: "active",            // Bypasses the waitlist
            isVerified: true,            // Bypasses email verification
            role: "admin",               // Grants admin dashboard access
            plan: "free",
            myInviteCode: "ADMIN-MASTER-001"
        };

        // Create the user using Mongoose so the pre('save') hook runs
        await User.create(adminDoc);
        console.log("✅ Admin user created successfully!");

    } catch (error) {
        console.error("❌ Error creating admin:", error);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
};

seedAdmin();