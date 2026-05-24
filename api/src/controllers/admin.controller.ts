import { Request, Response } from "express";
import { Types } from "mongoose";
import { DriverProfileModel, JeepneyModel, UserModel } from "../models";
import { createAuditLog } from "../services/audit.service";
import { createSignedGetUrl } from "../services/r2.service";
import { getPublicObjectUrl } from "../utils/object-url";
import { hashPassword } from "../utils/password";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

export const listApprovedDrivers = asyncHandler(async (_req: Request, res: Response) => {
  const approved = await DriverProfileModel.find({ approvalStatus: "approved" })
    .sort({ createdAt: -1 })
    .populate("userId", "name email phone status role createdAt")
    .lean();

  const drivers = approved
    .map((item) => {
      const populatedUser = item.userId as unknown as {
        _id?: Types.ObjectId;
        name?: string;
        email?: string;
        phone?: string;
        status?: string;
        role?: string;
        createdAt?: Date;
      };

      if (!populatedUser?._id || populatedUser.role !== "driver" || populatedUser.status !== "active") {
        return null;
      }

      return {
        userId: populatedUser._id.toString(),
        licenseNumber: item.licenseNumber,
        licenseFileKey: item.licenseFileKey,
        nbiFileKey: item.nbiFileKey || null,
        approvalStatus: item.approvalStatus,
        createdAt: item.createdAt,
        user: {
          id: populatedUser._id.toString(),
          name: populatedUser.name,
          email: populatedUser.email,
          phone: populatedUser.phone || null,
          status: populatedUser.status,
          createdAt: populatedUser.createdAt,
        },
      };
    })
    .filter(Boolean);

  res.status(200).json({ drivers });
});

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listAdminUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, role } = req.query as { search?: string; role?: string };
  const filter: Record<string, unknown> = {};

  if (role) {
    filter.role = role;
  }

  if (search?.trim()) {
    const regex = new RegExp(escapeRegExp(search.trim()), "i");
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const users = await UserModel.find(filter).sort({ createdAt: -1 }).lean();
  const driverUserIds = users.filter((user) => user.role === "driver").map((user) => user._id);
  const driverProfiles =
    driverUserIds.length > 0
      ? await DriverProfileModel.find({ userId: { $in: driverUserIds } }).lean()
      : [];

  const driverProfileMap = new Map(driverProfiles.map((profile) => [profile.userId?.toString(), profile]));

  const result = users.map((user) => {
    const driverProfile = user.role === "driver" ? driverProfileMap.get(user._id.toString()) : null;
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      driverProfile: driverProfile
        ? {
            licenseNumber: driverProfile.licenseNumber,
            licenseFileKey: driverProfile.licenseFileKey,
            nbiFileKey: driverProfile.nbiFileKey || null,
            approvalStatus: driverProfile.approvalStatus,
            createdAt: driverProfile.createdAt,
          }
        : null,
    };
  });

  res.status(200).json({ users: result });
});

export const createAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    licenseNumber,
    licenseFileKey,
    nbiFileKey,
  } = req.body as {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: "passenger" | "driver";
    licenseNumber?: string;
    licenseFileKey?: string;
    nbiFileKey?: string;
  };

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await UserModel.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "A user with that email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const user = await UserModel.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    role,
    status: role === "driver" ? "pending_verification" : "active",
    passwordHash,
  });

  if (role === "driver") {
    await DriverProfileModel.create({
      userId: user._id,
      licenseNumber: licenseNumber?.trim() || null,
      licenseFileKey: licenseFileKey?.trim() || "",
      nbiFileKey: nbiFileKey?.trim() || null,
      approvalStatus: "pending",
    });
  }

  await createAuditLog({
    actorUserId: req.authUser?.id ?? "",
    action: "USER_CREATED",
    targetType: "user",
    targetId: user._id.toString(),
    meta: { role },
  });

  res.status(201).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      driverProfile: role === "driver" ? { licenseNumber: licenseNumber || null, licenseFileKey: licenseFileKey || null, nbiFileKey: nbiFileKey || null, approvalStatus: "pending", createdAt: new Date() } : null,
    },
  });
});

export const updateAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, email, phone, password, status, driverProfile } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    status?: string;
    driverProfile?: {
      licenseNumber?: string;
      licenseFileKey?: string;
      nbiFileKey?: string;
    };
  };

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  if (email && email.trim().toLowerCase() !== user.email) {
    const existing = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
    if (existing) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "A user with that email already exists.");
    }
    user.email = email.trim().toLowerCase();
  }

  if (name) user.name = name.trim();
  if (typeof phone !== "undefined") user.phone = phone.trim() || null;
  if (status) user.status = status as any;
  if (password) user.passwordHash = await hashPassword(password);

  await user.save();

  if (driverProfile && user.role === "driver") {
    const profile = await DriverProfileModel.findOne({ userId: new Types.ObjectId(userId) });
    if (profile) {
      if (typeof driverProfile.licenseNumber !== "undefined") profile.licenseNumber = driverProfile.licenseNumber?.trim() || null;
      if (typeof driverProfile.licenseFileKey !== "undefined") profile.licenseFileKey = driverProfile.licenseFileKey?.trim() || profile.licenseFileKey;
      if (typeof driverProfile.nbiFileKey !== "undefined") profile.nbiFileKey = driverProfile.nbiFileKey?.trim() || null;
      await profile.save();
    }
  }

  await createAuditLog({
    actorUserId: req.authUser?.id ?? "",
    action: "USER_UPDATED",
    targetType: "user",
    targetId: userId,
    meta: { updatedFields: Object.keys(req.body) },
  });

  res.status(200).json({
    message: "User updated",
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
  });
});

export const deleteAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  await Promise.all([
    UserModel.findByIdAndDelete(userId),
    DriverProfileModel.deleteOne({ userId: new Types.ObjectId(userId) }),
  ]);

  await createAuditLog({
    actorUserId: req.authUser?.id ?? "",
    action: "USER_DELETED",
    targetType: "user",
    targetId: userId,
    meta: { role: user.role },
  });

  res.status(200).json({ message: "User deleted" });
});

export const getDriverDocumentUrl = asyncHandler(async (req: Request, res: Response) => {
  const { objectKey } = req.query as { objectKey: string };
  const signedUrl = await createSignedGetUrl({ objectKey });
  res.status(200).json({ url: signedUrl.url });
});

export const listPendingDrivers = asyncHandler(async (_req: Request, res: Response) => {
  const pending = await DriverProfileModel.find({ approvalStatus: "pending" })
    .sort({ createdAt: -1 })
    .populate("userId", "name email phone status createdAt")
    .lean();

  const driverIds = pending
    .map((item) => (item.userId && typeof item.userId === "object" ? (item.userId as any)._id?.toString() : item.userId?.toString()))
    .filter(Boolean) as string[];

  const jeepneysByDriver = new Map<string, { photoKey?: string | null; code?: string; plateNumber?: string }>();
  if (driverIds.length > 0) {
    const jeepneys = await JeepneyModel.find({
      driverId: { $in: driverIds.map((id) => new Types.ObjectId(id)) },
      status: "inactive",
    })
      .select("driverId photoKey code plateNumber")
      .lean();

    jeepneys.forEach((jeepney) => {
      const driverId = jeepney.driverId && typeof jeepney.driverId === "object" ? (jeepney.driverId as any)._id?.toString() : jeepney.driverId;
      if (driverId) {
        jeepneysByDriver.set(driverId, {
          photoKey: jeepney.photoKey || null,
          code: jeepney.code,
          plateNumber: jeepney.plateNumber,
        });
      }
    });
  }

  const drivers = pending.map((item) => {
    const populatedUser = item.userId as unknown as {
      _id?: Types.ObjectId;
      name?: string;
      email?: string;
      phone?: string;
      status?: string;
      createdAt?: Date;
    };
    const driverId = populatedUser?._id?.toString() || item.userId?.toString();
    const jeepney = driverId ? jeepneysByDriver.get(driverId) : undefined;

    return {
      userId: driverId,
      licenseNumber: item.licenseNumber,
      licenseFileKey: item.licenseFileKey,
      nbiFileKey: item.nbiFileKey || null,
      approvalStatus: item.approvalStatus,
      createdAt: item.createdAt,
      jeepneyPhotoKey: jeepney?.photoKey || null,
      jeepneyPhotoUrl: getPublicObjectUrl(jeepney?.photoKey || null),
      jeepneyCode: jeepney?.code || "",
      jeepneyPlateNumber: jeepney?.plateNumber || "",
      user: populatedUser
        ? {
            id: populatedUser._id?.toString(),
            name: populatedUser.name,
            email: populatedUser.email,
            phone: populatedUser.phone || null,
            status: populatedUser.status,
            createdAt: populatedUser.createdAt,
          }
        : null,
    };
  });

  res.status(200).json({ drivers });
});

export const approveDriver = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { userId } = req.params;
  const { reviewNotes } = req.body as { reviewNotes?: string };

  const driverProfile = await DriverProfileModel.findOne({ userId: new Types.ObjectId(userId) });
  if (!driverProfile) {
    throw new AppError(404, "DRIVER_PROFILE_NOT_FOUND", "Driver profile not found");
  }

  driverProfile.approvalStatus = "approved";
  driverProfile.reviewedBy = new Types.ObjectId(req.authUser.id);
  driverProfile.reviewNotes = reviewNotes?.trim() || null;
  await driverProfile.save();

  await UserModel.findByIdAndUpdate(userId, { $set: { status: "active" } });

  await JeepneyModel.updateMany(
    { driverId: new Types.ObjectId(userId), status: "inactive" },
    { $set: { status: "active" } }
  );

  await createAuditLog({
    actorUserId: req.authUser.id,
    action: "DRIVER_APPROVED",
    targetType: "user",
    targetId: userId,
    meta: { reviewNotes: reviewNotes?.trim() || null },
  });

  res.status(200).json({ message: "Driver approved" });
});

export const rejectDriver = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { userId } = req.params;
  const { reason } = req.body as { reason: string };

  const driverProfile = await DriverProfileModel.findOne({ userId: new Types.ObjectId(userId) });
  if (!driverProfile) {
    throw new AppError(404, "DRIVER_PROFILE_NOT_FOUND", "Driver profile not found");
  }

  driverProfile.approvalStatus = "rejected";
  driverProfile.reviewedBy = new Types.ObjectId(req.authUser.id);
  driverProfile.reviewNotes = reason.trim();
  await driverProfile.save();

  await UserModel.findByIdAndUpdate(userId, { $set: { status: "suspended" } });

  await createAuditLog({
    actorUserId: req.authUser.id,
    action: "DRIVER_REJECTED",
    targetType: "user",
    targetId: userId,
    meta: { reason: reason.trim() },
  });

  res.status(200).json({ message: "Driver rejected" });
});

export const approveJeepney = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { jeepneyId } = req.params;
  const { reviewNotes } = req.body as { reviewNotes?: string };

  const jeepney = await JeepneyModel.findById(jeepneyId);
  if (!jeepney || jeepney.status !== "inactive") {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "Jeepney not found or already approved");
  }

  jeepney.status = "active";
  await jeepney.save();

  await createAuditLog({
    actorUserId: req.authUser.id,
    action: "JEEPNEY_APPROVED",
    targetType: "jeepney",
    targetId: jeepneyId,
    meta: { reviewNotes: reviewNotes?.trim() || null },
  });

  res.status(200).json({ message: "Jeepney approved" });
});

export const rejectJeepney = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { jeepneyId } = req.params;
  const { reason } = req.body as { reason: string };

  const jeepney = await JeepneyModel.findById(jeepneyId);
  if (!jeepney || jeepney.status !== "inactive") {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "Jeepney not found or already rejected");
  }

  await JeepneyModel.findByIdAndDelete(jeepneyId);

  await createAuditLog({
    actorUserId: req.authUser.id,
    action: "JEEPNEY_REJECTED",
    targetType: "jeepney",
    targetId: jeepneyId,
    meta: { reason: reason.trim() },
  });

  res.status(200).json({ message: "Jeepney rejected" });
});
