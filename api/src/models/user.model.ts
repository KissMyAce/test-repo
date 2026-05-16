import mongoose, { InferSchemaType, Model, Schema, model } from "mongoose";
import { USER_ROLES, USER_STATUSES } from "../types/auth";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "passenger",
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      required: true,
      default: "active",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    profileImageKey: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    return ret;
  },
});

export type User = InferSchemaType<typeof userSchema>;
export const UserModel: Model<User> =
  (mongoose.models.User as Model<User> | undefined) || model<User>("User", userSchema);
