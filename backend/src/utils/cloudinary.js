import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uplodeOnCloudinary = async (localFilePath, cloudinaryFolder) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      folder: cloudinaryFolder,
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  await cloudinary.uploader.destroy(publicId);
};

export { uplodeOnCloudinary, deleteFromCloudinary };
