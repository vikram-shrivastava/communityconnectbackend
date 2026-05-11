import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/admin.middleware.js";
import { 
    getAllUsers, 
    toggleBanUser, 
    getAllPosts, 
    adminDeletePost, 
    getAllMatrimonyProfiles,
    approveUser
} from "../controllers/admin.controller.js";

const router = Router();

// Apply both middlewares to all admin routes
router.use(verifyJWT, isAdmin);

// User Management
router.route("/users").get(getAllUsers);
router.route("/users/:userId/ban").patch(toggleBanUser);
router.route("/users/:userId/approve").patch(approveUser); // <-- ADD THIS LINE

// Post Management
router.route("/posts").get(getAllPosts);
router.route("/posts/:postId").delete(adminDeletePost);

// Matrimony Management
router.route("/matrimony").get(getAllMatrimonyProfiles);

export default router;