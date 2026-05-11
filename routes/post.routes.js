import { Router } from "express";
import { 
    createPost, getFeed, toggleLikePost, 
    addComment, getComments, deletePost,getUserPosts 
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPost).get(getFeed);
router.route("/:postId").delete(deletePost);
router.route("/like/:postId").post(toggleLikePost);
router.route("/comment/:postId").post(addComment).get(getComments);
router.route("/user/:userId").get(getUserPosts); // <-- ADD THIS ROUTE
export default router;