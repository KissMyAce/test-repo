import mongoose, { InferSchemaType, Model, Schema, Types, model } from "mongoose";

export const SCHEDULE_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

const scheduleSchema = new Schema(
  {
    jeepneyId: {
      type: Schema.Types.ObjectId,
      ref: "Jeepney",
      required: true,
      index: true,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
      index: true,
    },
    departureAt: {
      type: Date,
      required: true,
      index: true,
    },
    arrivalAt: {
      type: Date,
      required: true,
      validate: {
        validator(this: { departureAt?: Date }, value: Date) {
          if (!this.departureAt || !(value instanceof Date)) return true;
          return value.getTime() > this.departureAt.getTime();
        },
        message: "arrivalAt must be later than departureAt",
      },
    },
    status: {
      type: String,
      enum: SCHEDULE_STATUSES,
      required: true,
      default: "scheduled",
      index: true,
    },
    pendingBookedSeats: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    confirmedBookedSeats: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

scheduleSchema.index({ routeId: 1, departureAt: 1 });
scheduleSchema.index({ jeepneyId: 1, departureAt: 1 });

export type Schedule = InferSchemaType<typeof scheduleSchema> & {
  jeepneyId: Types.ObjectId;
  routeId: Types.ObjectId;
};

export const ScheduleModel: Model<Schedule> =
  (mongoose.models.Schedule as Model<Schedule> | undefined) ||
  model<Schedule>("Schedule", scheduleSchema);
