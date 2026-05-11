import { handleerror } from "../utils/apiError.js"; // Match exact file casing
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import User from "../models/users.model.js";
export const verifyJWT = asynchandler(async (req, res, next) => {
    try {
        // FIX: Match exact cookie name "accessToken"
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            throw new handleerror(401, "Unauthorized request: No token provided");
        }
        
        // jwt.verify throws an error automatically if token is expired or invalid
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // FIX: Match exact field name "-refreshToken"
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        
        if (!user) {
            throw new handleerror(401, "Invalid Access Token: User no longer exists");
        }
        
        req.user = user;
        next();
    } catch (error) {
        // Distinguish between expired token and other errors
        const message = error.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
        next(new handleerror(401, message));
    }
});