import mongoose, { InferSchemaType, Model, Schema, Types, model } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    ip: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, createdAt: -1 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema> & {
  userId: Types.ObjectId;
};

export const RefreshTokenModel: Model<RefreshToken> =
  (mongoose.models.RefreshToken as Model<RefreshToken> | undefined) ||
  model<RefreshToken>("RefreshToken", refreshTokenSchema);
