import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uplodeOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { sendEmail, forgotPasswordMailgenContent } from "../utils/mail.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
import { options } from "../constants.js";
import crypto from "crypto";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating the access token."
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(
      400,
      "Missing or incomplete information. Please fill out all required fields to sign up."
    );
  }

  const userExist = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (userExist) {
    throw new ApiError(
      409,
      "The account already exists. Please use a different username and email to sign up."
    );
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
  });
  if (!user) {
    throw new ApiError(
      500,
      "Registration failed due to an unexpected server error. Please try again later."
    );
  }

  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createUser) {
    throw new ApiError(
      500,
      "Failed to find user due to an unexpected server error. Please try again later."
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createUser },
        "Account created successfully. Welcome aboard!"
      )
    );
});

const login = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(
      400,
      "Missing or incomplete information. Please fill out all required fields to log in."
    );
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(
      401,
      "Incorrect email or username or password. Please verify your credentials and try again."
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(
      400,
      "Invalid password. Please enter the correct password and try again."
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!loggedUser) {
    throw new ApiError(
      500,
      "Failed to retrieve user information due to an unexpected server error. Please try again later"
    );
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedUser, accessToken, refreshToken },
        "Login successful. Welcome back!"
      )
    );
});

const logout = asyncHandler(async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 },
      },
      { new: true }
    );

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "Logout successful. Have a great day!"));
  } catch (error) {
    throw new ApiError(
      500,
      "Logout failed due to an unexpected server error. Please try again later."
    );
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          req.user,
          "Current user details retrieved successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      "Current user retrieve failed due to an unexpected server error. Please try again later."
    );
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Missing or invalid refresh token");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findOne(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Missing or invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(
        401,
        "Refresh token mismatch. Please reauthenticate to obtain a new access token"
      );
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Refresh access token successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Missing or invalid refresh token"
    );
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!(currentPassword || newPassword)) {
    throw new ApiError(
      400,
      "Missing or incomplete information. Please fill out all required fields to change password."
    );
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(
      500,
      "Failed to retrieve user information. Please try again later."
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(400, "Password invalid, Please enter correct password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Change password successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(
      400,
      "Missing or incomplete information. Please fill out required field to forgot password"
    );
  }

  const user = await User.findOne({ $or: [{ email }] });
  if (!user) {
    throw new ApiError(404, "User does not exists", []);
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset email sent successfully. Please check your inbox for further instructions."
      )
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    throw new ApiError(
      400,
      "Missing or incomplete information. Please fill out required field to reset password"
    );
  }

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(489, "Token is invalid or expired");
  }

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset successful. You can now log in with your new password"
      )
    );
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uplodeOnCloudinary(avatarLocalPath, "portfolio/user");
  if (!avatar) {
    throw new ApiError(
      500,
      "Failed to upload avatar. Please ensure the file format is supported."
    );
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const updateAvatar = await User.findByIdAndUpdate(
    user,
    {
      $set: {
        avatar: {
          url: avatar.url,
          publicId: avatar.public_id,
        },
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  if (!updateAvatar) {
    throw new ApiError(
      500,
      "Updating avatar failed due to an unexpected server error. Please try again later."
    );
  }

  const avatarPublicId = user.avatar.publicId;
  await deleteFromCloudinary(avatarPublicId);

  return res
    .status(200)
    .json(new ApiResponse(200, updateAvatar, "Avatar uploaded successfully"));
});

const UpdateAccountDetail = asyncHandler(async (req, res) => {
  const { fullName, username, email } = req.body;

  const updateAccount = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        username,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  if (!updateAccount) {
    throw new ApiError(
      500,
      "Updating Account failed due to an unexpected server error. Please try again later"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updateAccount, "Account update Successfully"));
});

const myProjects = asyncHandler(async (req, res) => {});

export {
  registerUser,
  login,
  logout,
  getCurrentUser,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword,
  updateAvatar,
  UpdateAccountDetail,
  myProjects,
};
