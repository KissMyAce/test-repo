import { Request, Response } from "express";
import { Types } from "mongoose";
import { env } from "../config/env";
import { DriverProfileModel, RefreshTokenModel, UserModel } from "../models";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { clearRefreshTokenCookie, REFRESH_COOKIE_NAME, setRefreshTokenCookie } from "../utils/cookies";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  signResetToken,
  verifyRefreshToken,
  verifyResetToken,
} from "../utils/token";

const toAuthUser = (user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: "passenger" | "driver" | "admin";
  status: "active" | "pending_verification" | "suspended";
}) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
});

const buildAccessToken = (user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: "passenger" | "driver" | "admin";
  status: "active" | "pending_verification" | "suspended";
}) =>
  signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    status: user.status,
    email: user.email,
    name: user.name,
  });

const createRefreshSession = async (req: Request, res: Response, userId: string) => {
  const rawRefreshToken = signRefreshToken(userId);
  const refreshTokenHash = hashToken(rawRefreshToken);

  await RefreshTokenModel.create({
    userId: new Types.ObjectId(userId),
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    ip: req.ip,
    userAgent: req.header("user-agent") || null,
  });

  setRefreshTokenCookie(res, rawRefreshToken);
};

const revokeRefreshToken = async (rawToken?: string | null) => {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await RefreshTokenModel.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

const REFRESH_ROTATION_GRACE_MS = 15_000;

const isAllowedDriverDocumentKey = (
  key: string,
  purpose: "driver-license" | "driver-nbi" | "driver-photo"
) => {
  if (key.startsWith("driver-docs/")) {
    return true;
  }
  const preregPattern = new RegExp(
    `^prereg-driver\\/[^/]+\\/${purpose.replace("-", "\\-")}\\/[^/]+$`
  );
  return preregPattern.test(key);
};

export const registerPassenger = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body as {
    name: string;
    email: string;
    password: string;
    phone?: string;
  };

  const exists = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (exists) {
    throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    phone: phone?.trim() || null,
    role: "passenger",
    status: "active",
  });

  const accessToken = buildAccessToken(user);
  await createRefreshSession(req, res, user._id.toString());

  res.status(201).json({
    user: toAuthUser(user),
    accessToken,
  });
});

export const registerDriver = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone,
    password,
    licenseNumber,
    licenseFileKey,
    nbiFileKey,
    profileImageKey,
  } = req.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
    licenseNumber: string;
    licenseFileKey: string;
    nbiFileKey?: string;
    profileImageKey?: string;
  };

  if (!isAllowedDriverDocumentKey(licenseFileKey, "driver-license")) {
    throw new AppError(400, "INVALID_LICENSE_FILE_KEY", "Invalid license file key");
  }
  if (nbiFileKey && !isAllowedDriverDocumentKey(nbiFileKey, "driver-nbi")) {
    throw new AppError(400, "INVALID_NBI_FILE_KEY", "Invalid NBI file key");
  }
  if (profileImageKey && !isAllowedDriverDocumentKey(profileImageKey, "driver-photo")) {
    throw new AppError(400, "INVALID_PROFILE_IMAGE_KEY", "Invalid profile image file key");
  }

  const exists = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (exists) {
    throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    phone: phone.trim(),
    profileImageKey: profileImageKey || null,
    role: "driver",
    status: "pending_verification",
  });

  await DriverProfileModel.create({
    userId: user._id,
    licenseNumber: licenseNumber.trim(),
    licenseFileKey,
    nbiFileKey: nbiFileKey || null,
    approvalStatus: "pending",
  });

  res.status(201).json({
    message: "Driver registration submitted and pending verification.",
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await UserModel.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !user.passwordHash) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = buildAccessToken(user);
  await createRefreshSession(req, res, user._id.toString());

  res.status(200).json({
    user: toAuthUser(user),
    accessToken,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!rawRefreshToken) {
    throw new AppError(401, "UNAUTHORIZED", "Missing refresh token");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
  }

  const refreshTokenHash = hashToken(rawRefreshToken);
  const session = await RefreshTokenModel.findOne({ tokenHash: refreshTokenHash });
  if (!session) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh session not found");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token expired");
  }

  if (session.revokedAt) {
    const sameClient =
      (session.ip || null) === (req.ip || null) &&
      (session.userAgent || null) === ((req.header("user-agent") || null) as string | null);
    const withinGrace = Date.now() - session.revokedAt.getTime() <= REFRESH_ROTATION_GRACE_MS;

    if (!sameClient || !withinGrace) {
      throw new AppError(401, "UNAUTHORIZED", "Refresh session not found or revoked");
    }
  }

  const user = await UserModel.findById(decoded.sub);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User no longer exists");
  }

  // Rotate refresh token once. During a short grace window, duplicate refresh requests from
  // the same client are allowed to avoid accidental logout on hard refresh/race conditions.
  if (!session.revokedAt) {
    session.revokedAt = new Date();
    await session.save();
  }
  await createRefreshSession(req, res, user._id.toString());

  const accessToken = buildAccessToken(user);
  res.status(200).json({
    user: toAuthUser(user),
    accessToken,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await revokeRefreshToken(rawRefreshToken);
  clearRefreshTokenCookie(res);
  res.status(200).json({ message: "Logged out" });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  await RefreshTokenModel.updateMany(
    { userId: new Types.ObjectId(req.authUser.id), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  clearRefreshTokenCookie(res);
  res.status(200).json({ message: "All sessions logged out" });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await UserModel.findOne({ email: email.toLowerCase() });

  // Always respond success to avoid account enumeration.
  if (!user) {
    return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
  }

  const resetToken = signResetToken({
    sub: user._id.toString(),
    email: user.email,
  });

  res.status(200).json({
    message: "If the email exists, a reset link has been sent.",
    // In production, send this by email and do not return it.
    resetToken,
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };

  let decoded;
  try {
    decoded = verifyResetToken(token);
  } catch {
    throw new AppError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired");
  }

  const user = await UserModel.findById(decoded.sub).select("+passwordHash");
  if (!user || user.email !== decoded.email) {
    throw new AppError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired");
  }

  user.passwordHash = await hashPassword(password);
  await user.save();

  await RefreshTokenModel.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  res.status(200).json({ message: "Password reset successful" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await UserModel.findById(req.authUser.id);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }

  res.status(200).json({ user: toAuthUser(user) });
});
