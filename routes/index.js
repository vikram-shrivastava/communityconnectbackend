import { Router } from "express";
import authRouter from "./auth.routes.js";
import profileRouter from "./profile.routes.js";
import matrimonyRouter from "./matrimony.routes.js";
import postRouter from "./post.routes.js";
import campaignRouter from "./campaign.routes.js";
import paymentRouter from "./payment.routes.js";
import uploadRouter from "./upload.routes.js";
import adminRouter from "./admin.routes.js";
import communityRouter from "./community.routes.js"
const rootRouter = Router();

rootRouter.use("/auth", authRouter);
rootRouter.use("/profiles", profileRouter);
rootRouter.use("/matrimony", matrimonyRouter);
rootRouter.use("/posts", postRouter);
rootRouter.use("/campaigns", campaignRouter);
rootRouter.use("/payments", paymentRouter);
rootRouter.use("/upload", uploadRouter);
rootRouter.use("/admin", adminRouter); 
rootRouter.use("/community", communityRouter); // ✅ ADDED: Community routes
export default rootRouter;