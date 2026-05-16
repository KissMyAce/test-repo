import mongoose, { InferSchemaType, Model, Schema, Types, model } from "mongoose";

export const JEEPNEY_STATUSES = ["active", "inactive"] as const;
export type JeepneyStatus = (typeof JEEPNEY_STATUSES)[number];

const jeepneySchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    plateNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
      default: 20,
    },
    status: {
      type: String,
      enum: JEEPNEY_STATUSES,
      required: true,
      default: "active",
      index: true,
    },
    photoKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jeepneySchema.index({ routeId: 1, status: 1 });

export type Jeepney = InferSchemaType<typeof jeepneySchema> & {
  routeId: Types.ObjectId;
  driverId: Types.ObjectId;
};

export const JeepneyModel: Model<Jeepney> =
  (mongoose.models.Jeepney as Model<Jeepney> | undefined) ||
  model<Jeepney>("Jeepney", jeepneySchema);
