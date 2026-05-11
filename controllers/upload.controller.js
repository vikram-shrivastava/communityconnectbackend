import { v2 as cloudinary } from "cloudinary";
import { asynchandler } from "../utils/asynchandler.js";
import { handleresponse } from "../utils/apiResponse.js";

// Configure Cloudinary with your credentials (from .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================================
// GENERATE UPLOAD SIGNATURE
// ==========================================
export const generateSignature = asynchandler(async (req, res) => {
    // We generate a timestamp. Cloudinary signatures expire quickly for security.
    const timestamp = Math.round(new Date().getTime() / 1000);

    // You can force files into a specific folder here
    const folder = req.query.folder || "kayasth_connect_general"; 

    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp: timestamp,
            folder: folder
        },
        process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json(
        new handleresponse(200, {
            signature,
            timestamp,
            folder,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME
        }, "Signature generated successfully")
    );
});