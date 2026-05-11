import { Router } from "express";
import { 
    getMatrimonyFeed, expressInterest, passProfile, 
    getPendingRequests, getMutualMatches 
} from "../controllers/matrimony.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/feed").get(getMatrimonyFeed);
router.route("/interest").post(expressInterest);
router.route("/pass").post(passProfile);
router.route("/requests").get(getPendingRequests);
router.route("/matches").get(getMutualMatches);

export default router;