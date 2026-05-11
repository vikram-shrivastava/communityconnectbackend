import { Router } from "express";
import { 
    initializeCampaign, getMyCampaigns, toggleCampaignStatus,
    recordAdImpression, recordAdClick 
} from "../controllers/campaign.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/init").post(verifyJWT, initializeCampaign);
router.route("/my-ads").get(verifyJWT, getMyCampaigns);
router.route("/status/:campaignId").patch(verifyJWT, toggleCampaignStatus);

// Public routes (Called from feed)
router.route("/impression/:campaignId").post(recordAdImpression);
router.route("/click/:campaignId").post(recordAdClick);

export default router;