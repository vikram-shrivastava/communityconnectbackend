import { Router } from "express";
import { 
    createProfile, getMyProfile, updateGeneralProfile, 
    updateMatrimonyProfile, deleteProfile, getUserProfile 
} from "../controllers/profile.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Protect all profile routes

router.route("/").post(createProfile).get(getMyProfile).delete(deleteProfile);
router.route("/update-general").patch(updateGeneralProfile);
router.route("/update-matrimony").patch(updateMatrimonyProfile);
router.route("/user/:userId").get(getUserProfile); // Public route to view others' profiles

export default router;