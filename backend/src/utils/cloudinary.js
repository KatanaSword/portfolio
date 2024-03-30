import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uplodeOnCloudinary = async (localFilePath) => {
  if (localFilePath) {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
    });
    fs.unlink(localFilePath);
    return response.url;
  } else {
    fs.unlink(localFilePath);
    return null;
  }
};

export { uplodeOnCloudinary };
