import { Router } from "express";
import { 
    registerUser, loginUser, verifyUser, 
    refreshAccessToken, getMyInviteLink 
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/verify").post(verifyUser);
router.route("/refresh-token").post(refreshAccessToken);

// Protected Routes
router.route("/invite-link").get(verifyJWT, getMyInviteLink);

export default router;