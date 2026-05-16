import { Request, Response } from "express";
import { Types } from "mongoose";
import { DriverProfileModel, UserModel } from "../models";
import { createAuditLog } from "../services/audit.service";
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

export const listPendingDrivers = asyncHandler(async (_req: Request, res: Response) => {
  const pending = await DriverProfileModel.find({ approvalStatus: "pending" })
    .sort({ createdAt: -1 })
    .populate("userId", "name email phone status createdAt")
    .lean();

  const drivers = pending.map((item) => {
    const populatedUser = item.userId as unknown as {
      _id?: Types.ObjectId;
      name?: string;
      email?: string;
      phone?: string;
      status?: string;
      createdAt?: Date;
    };

    return {
      userId: populatedUser?._id?.toString() || item.userId?.toString(),
      licenseNumber: item.licenseNumber,
      licenseFileKey: item.licenseFileKey,
      nbiFileKey: item.nbiFileKey || null,
      approvalStatus: item.approvalStatus,
      createdAt: item.createdAt,
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
