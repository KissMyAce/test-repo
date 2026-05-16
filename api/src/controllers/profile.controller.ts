import { Request, Response } from "express";
import { UserModel } from "../models";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { getPublicObjectUrl } from "../utils/object-url";
import { hashPassword, verifyPassword } from "../utils/password";
import { buildScopedObjectKey, createPresignedUploadUrl } from "../services/r2.service";

const profilePayload = (user: {
  name: string;
  email: string;
  phone?: string | null;
  profileImageKey?: string | null;
}) => ({
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  profileImageKey: user.profileImageKey || null,
  profileImageUrl: getPublicObjectUrl(user.profileImageKey || null),
});

export const getProfileMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await UserModel.findById(req.authUser.id);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  res.status(200).json({ user: profilePayload(user) });
});

export const updateProfileMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { name, phone } = req.body as { name?: string; phone?: string };

  const user = await UserModel.findById(req.authUser.id);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  if (typeof name === "string" && name.trim()) {
    user.name = name.trim();
  }

  if (typeof phone === "string") {
    user.phone = phone.trim() || null;
  }

  await user.save();

  res.status(200).json({ user: profilePayload(user) });
});

export const changeProfilePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  const user = await UserModel.findById(req.authUser.id).select("+passwordHash");
  if (!user || !user.passwordHash) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  res.status(200).json({ message: "Password updated" });
});

export const getAvatarUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { fileName, contentType } = req.body as {
    fileName: string;
    contentType: string;
  };

  const objectKey = buildScopedObjectKey(req.authUser.id, "avatar", fileName);
  const signed = await createPresignedUploadUrl({ objectKey, contentType });

  res.status(200).json(signed);
});

export const commitAvatarUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { objectKey } = req.body as { objectKey: string };

  const expectedPrefix = `avatars/${req.authUser.id}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
    throw new AppError(403, "FORBIDDEN", "Invalid object key scope");
  }

  const user = await UserModel.findById(req.authUser.id);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  user.profileImageKey = objectKey;
  await user.save();

  res.status(200).json({ user: profilePayload(user) });
});
