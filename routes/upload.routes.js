import { Router } from "express";
import { generateSignature } from "../controllers/upload.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/signature").get(verifyJWT, generateSignature);

export default router;