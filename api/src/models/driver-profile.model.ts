import mongoose, { InferSchemaType, Model, Schema, Types, model } from "mongoose";
import { DRIVER_APPROVAL_STATUSES } from "../types/auth";

const driverProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    licenseFileKey: {
      type: String,
      required: true,
      trim: true,
    },
    nbiFileKey: {
      type: String,
      trim: true,
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: DRIVER_APPROVAL_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

driverProfileSchema.index({ approvalStatus: 1, createdAt: -1 });

export type DriverProfile = InferSchemaType<typeof driverProfileSchema> & {
  userId: Types.ObjectId;
  reviewedBy?: Types.ObjectId | null;
};

export const DriverProfileModel: Model<DriverProfile> =
  (mongoose.models.DriverProfile as Model<DriverProfile> | undefined) ||
  model<DriverProfile>("DriverProfile", driverProfileSchema);
