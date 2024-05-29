import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
  createProjects,
  deleteProject,
  getAllProjects,
  getProjectById,
  updateImages,
  updateProjects,
} from "../controllers/projects.controllers.js";

const router = Router();

router
  .route("/")
  .get(getAllProjects)
  .post(
    verifyJWT,
    upload.fields([{ name: "images", maxCount: 4 }]),
    createProjects
  );
router
  .route("/update-images/:projectId")
  .patch(
    verifyJWT,
    upload.fields([{ name: "images", maxCount: 4 }]),
    updateImages
  );
router
  .route("/:projectId")
  .get(getProjectById)
  .patch(verifyJWT, updateProjects)
  .delete(verifyJWT, deleteProject);

export default router;
