import mongoose, { InferSchemaType, Model, Schema, Types, model } from "mongoose";

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "failed_payment"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const bookingSchema = new Schema(
  {
    bookingRef: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    passengerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
      index: true,
    },
    routeSnapshot: {
      name: { type: String, required: true, trim: true },
      origin: { type: String, required: true, trim: true },
      destination: { type: String, required: true, trim: true },
    },
    jeepneySnapshot: {
      code: { type: String, required: true, trim: true },
      plateNumber: { type: String, required: true, trim: true },
      capacity: { type: Number, required: true, min: 1 },
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
    unitFare: {
      type: Number,
      required: true,
      min: 0,
    },
    totalFare: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    cancelReason: {
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

bookingSchema.index({ passengerId: 1, createdAt: -1 });
bookingSchema.index({ scheduleId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

bookingSchema.path("totalFare").validate(function validateTotalFare(value: number) {
  if (typeof value !== "number") return false;
  const expected = Number(this.seats || 0) * Number(this.unitFare || 0);
  return Math.abs(value - expected) < 0.0001;
}, "totalFare must be seats * unitFare");

export type Booking = InferSchemaType<typeof bookingSchema> & {
  passengerId: Types.ObjectId;
  scheduleId: Types.ObjectId;
};

export const BookingModel: Model<Booking> =
  (mongoose.models.Booking as Model<Booking> | undefined) ||
  model<Booking>("Booking", bookingSchema);
