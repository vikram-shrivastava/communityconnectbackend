import { handleerror } from "../utils/apiError.js";

export const isAdmin = (req, res, next) => {
    // Check if the user exists and has the admin role
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        throw new handleerror(403, "Access denied. Admin privileges required.");
    }
};