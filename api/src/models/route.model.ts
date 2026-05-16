import mongoose, { InferSchemaType, Model, Schema, model } from "mongoose";

const routeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    baseFare: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

routeSchema.index({ name: 1 });
routeSchema.index({ isActive: 1 });
routeSchema.index({ origin: 1, destination: 1 });

export type Route = InferSchemaType<typeof routeSchema>;
export const RouteModel: Model<Route> =
  (mongoose.models.Route as Model<Route> | undefined) || model<Route>("Route", routeSchema);
