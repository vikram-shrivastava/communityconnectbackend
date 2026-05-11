import { Router } from "express";
import { getChatHistory } from "../controllers/message.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/:userId").get(getChatHistory);

export default router;