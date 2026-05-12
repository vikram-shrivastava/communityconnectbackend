import { Router } from "express";
import { 
    createProfile, 
    getMyProfile, 
    updateGeneralProfile, 
    updateMatrimonyProfile, 
    deleteProfile, 
    getUserProfile,
    getTotalMembers, // ✅ ADDED: Missing import
    getMemberDirectory
} from "../controllers/profile.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Protect all profile routes

// ✅ CORRECT: Specific static routes go first
router.get("/members/count", getTotalMembers);

router.route("/")
    .post(createProfile)
    .get(getMyProfile)
    .delete(deleteProfile);
    
router.route("/directory").get(getMemberDirectory);
router.route("/update-general").patch(updateGeneralProfile);
router.route("/update-matrimony").patch(updateMatrimonyProfile);

// ✅ FIXED: Changed "/user/:userId" to "/:userId" to match the frontend API call
router.route("/:userId").get(getUserProfile); 
export default router;