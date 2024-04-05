import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

const verifyToken = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer", "");
    if (!token) {
      throw new apiError(401, "Missing or invalid authentication token");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECURE);
    if (!decodedToken) {
      throw new apiError(401, "Missing or invalid access token");
    }

    const user = await User.findById(decodedToken?._id);

    req.user = user;
    next();
  } catch (error) {
    throw new apiError(
      401,
      error?.message || "Missing or invalid access token"
    );
  }
});

export { verifyToken };
