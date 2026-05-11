import { Router } from "express";
import { createCampaignOrder, verifyCampaignPayment, createSubscriptionOrder, verifySubscriptionPayment  } from "../controllers/payment.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/create-order").post(verifyJWT, createCampaignOrder);
router.route("/verify").post(verifyJWT, verifyCampaignPayment);

router.route("/create-subscription").post(verifyJWT, createSubscriptionOrder);
router.route("/verify-subscription").post(verifyJWT, verifySubscriptionPayment);

export default router;