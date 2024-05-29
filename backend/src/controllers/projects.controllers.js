import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Project } from "../models/projects.models.js";
import {
  deleteFromCloudinary,
  uplodeOnCloudinary,
} from "../utils/cloudinary.js";
import { getMongoosePaginationOptions } from "../utils/helpers.js";

const getAllProjects = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const projectsAggregate = Project.aggregate([{ $match: {} }]);
  if (projectsAggregate.length < 1) {
    throw new ApiError(404, "Project dose not exist");
  }

  const projects = await Project.aggregatePaginate(
    projectsAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "totalProjects",
        docs: "projects",
      },
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Project fetch successfully"));
});

const createProjects = asyncHandler(async (req, res) => {
  const { name, description, github, website } = req.body;
  if (
    [name, description, github, website].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(
      400,
      "Missing or incomplete information. Please fill out all required fields to create project."
    );
  }

  const imagesLocalPath = req.files["images"];
  console.log(imagesLocalPath);
  if (!imagesLocalPath) {
    throw new ApiError(400, "Project images is missing");
  }

  const projectImages = [];
  for (let i = 0; i < imagesLocalPath.length; i++) {
    const localPath = imagesLocalPath[i].path;
    const images = await uplodeOnCloudinary(localPath, "portfolio/projects");
    const newProjectImages = { url: images.url, publicId: images.public_id };
    projectImages.push(newProjectImages);
  }

  if (!projectImages) {
    throw new ApiError(
      500,
      "Failed to upload images. Please ensure the file format is supported"
    );
  }

  const createProject = await Project.create({
    name,
    description,
    images: projectImages,
    github: {
      url: github,
    },
    website: {
      url: website,
    },
    owner: req.user._id,
  });
  if (!createProject) {
    throw new ApiError(
      500,
      "Failed to create project due to an unexpected server error. Please try again later."
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { project: createProject },
        "Project created successfully."
      )
    );
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project retrieve successfully"));
});

const updateProjects = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, github, website } = req.body;

  const updateProject = await Project.findByIdAndUpdate(
    projectId,
    {
      $set: {
        name,
        description,
        github: { url: github?.url },
        website: { url: website?.url },
      },
    },
    { new: true }
  );
  if (!updateProject) {
    throw new ApiError(
      500,
      "Failed to update due to an unexpected server error. Please try again later."
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updateProject, "Update project successful"));
});

const updateImages = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project does not exist");
  }

  const imagesLocalPath = req.files["images"];
  if (!imagesLocalPath) {
    throw new ApiError(
      400,
      "Invalid files upload. Please select a valid image file."
    );
  }

  const projectImages = [];
  for (let i = 0; i < imagesLocalPath.length; i++) {
    const localPath = imagesLocalPath[i].path;
    const images = await uplodeOnCloudinary(localPath, "portfolio/projects");
    const newProjectImages = { url: images.url, publicId: images.public_id };
    projectImages.push(newProjectImages);
  }

  if (!projectImages) {
    throw new ApiError(
      400,
      "Failed to upload images. Please ensure the file format is supported"
    );
  }

  const updateImages = await Project.findByIdAndUpdate(
    project,
    {
      $set: {
        images: projectImages,
      },
    },
    { new: true }
  );
  if (!project) {
    throw new ApiError(
      500,
      "Failed to update project images due to an unexpected server error. Please try again later"
    );
  }

  for (let i = 0; i < project.images.length; i++) {
    const publicId = project.images[i].publicId;
    console.log(publicId);
    await deleteFromCloudinary(publicId);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updateImages, "Update project images successfully")
    );
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project does not exist");
  }

  const deleteProject = await Project.findByIdAndDelete(project);
  if (!deleteProject) {
    throw new ApiError(404, "Project does not exist");
  }

  for (let i = 0; i < project.images.length; i++) {
    const publicId = project.images[i].publicId;
    await deleteFromCloudinary(publicId);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { deleteProject }, "Project delete successful"));
});

export {
  createProjects,
  getAllProjects,
  getProjectById,
  updateProjects,
  updateImages,
  deleteProject,
};
