import { Router } from "express";
import {
  UpdateAccountDetail,
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  myProjects,
  refreshAccessToken,
  registerUser,
  resetPassword,
  updateAvatar,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

// unsecure routes
router.route("/register").post(registerUser);
router.route("/login").post(login);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:resetToken").post(resetPassword);

// secure routes
router.route("/logout").post(verifyJWT, logout);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/change-password").patch(verifyJWT, changePassword);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/update-account").patch(verifyJWT, UpdateAccountDetail);
router.route("/get-projects").get(verifyJWT, myProjects);

export default router;
