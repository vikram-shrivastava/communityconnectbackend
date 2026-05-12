import { Router } from "express";
import { getWaitlist, approveUser } from "../controllers/community.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Protect these routes (Consider adding an admin/moderator check middleware here later)
router.use(verifyJWT); 

router.get("/waitlist", getWaitlist);
router.patch("/users/:userId/approve", approveUser);

export default router;