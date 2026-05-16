import mongoose, { ClientSession, Types } from "mongoose";
import { BookingModel, BookingStatus, ScheduleModel } from "../models";
import { AppError } from "../utils/app-error";

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed"];
const toObjectId = (value: string | Types.ObjectId) =>
  typeof value === "string" ? new Types.ObjectId(value) : value;

export const generateBookingRef = () => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BKG-${timePart}-${randomPart}`;
};

export const reserveScheduleSeats = async (params: {
  scheduleId: string | Types.ObjectId;
  requestedSeats: number;
  seatCapacity: number;
  session?: ClientSession;
}) => {
  if (!Number.isInteger(params.requestedSeats) || params.requestedSeats <= 0) {
    throw new AppError(400, "INVALID_SEATS", "requestedSeats must be a positive integer");
  }

  if (!Number.isFinite(params.seatCapacity) || params.seatCapacity <= 0) {
    throw new AppError(400, "INVALID_CAPACITY", "seatCapacity must be greater than zero");
  }

  const scheduleId =
    toObjectId(params.scheduleId);

  const updatedSchedule = await ScheduleModel.findOneAndUpdate(
    {
      _id: scheduleId,
      status: "scheduled",
      $expr: {
        $lte: [
          {
            $add: [
              { $ifNull: ["$pendingBookedSeats", 0] },
              { $ifNull: ["$confirmedBookedSeats", 0] },
              params.requestedSeats,
            ],
          },
          params.seatCapacity,
        ],
      },
    },
    {
      $inc: {
        pendingBookedSeats: params.requestedSeats,
      },
    },
    {
      new: true,
      session: params.session,
    }
  ).lean();

  if (!updatedSchedule) {
    throw new AppError(409, "NO_AVAILABLE_SEATS", "Requested seats exceed available capacity");
  }

  return updatedSchedule;
};

export const releasePendingScheduleSeats = async (params: {
  scheduleId: string | Types.ObjectId;
  seats: number;
  session?: ClientSession;
}) => {
  if (!Number.isInteger(params.seats) || params.seats <= 0) {
    return;
  }

  const scheduleId =
    toObjectId(params.scheduleId);

  await ScheduleModel.updateOne(
    { _id: scheduleId },
    {
      $inc: {
        pendingBookedSeats: -params.seats,
      },
    },
    { session: params.session }
  );
};

export const movePendingSeatsToConfirmed = async (params: {
  scheduleId: string | Types.ObjectId;
  seats: number;
  session?: ClientSession;
}) => {
  if (!Number.isInteger(params.seats) || params.seats <= 0) {
    return;
  }

  const scheduleId =
    toObjectId(params.scheduleId);

  await ScheduleModel.updateOne(
    { _id: scheduleId },
    {
      $inc: {
        pendingBookedSeats: -params.seats,
        confirmedBookedSeats: params.seats,
      },
    },
    { session: params.session }
  );
};

export const countBookedSeats = async (scheduleId: string | Types.ObjectId, session?: ClientSession) => {
  const parsedScheduleId = toObjectId(scheduleId);

  const query = BookingModel.aggregate<{ seats: number }>([
    {
      $match: {
        scheduleId: parsedScheduleId,
        status: { $in: ACTIVE_BOOKING_STATUSES },
      },
    },
    {
      $group: {
        _id: null,
        seats: { $sum: "$seats" },
      },
    },
  ]);
  if (session) query.session(session);
  const result = await query;

  return result[0]?.seats || 0;
};

export const releaseConfirmedScheduleSeats = async (params: {
  scheduleId: string | Types.ObjectId;
  seats: number;
  session?: ClientSession;
}) => {
  if (!Number.isInteger(params.seats) || params.seats <= 0) {
    return;
  }

  const scheduleId = toObjectId(params.scheduleId);

  await ScheduleModel.updateOne(
    { _id: scheduleId },
    {
      $inc: {
        confirmedBookedSeats: -params.seats,
      },
    },
    { session: params.session }
  );
};

export const createPendingBookingAtomic = async (params: {
  passengerId: string | Types.ObjectId;
  scheduleId: string | Types.ObjectId;
  requestedSeats: number;
  seatCapacity: number;
  unitFare: number;
  routeSnapshot: {
    name: string;
    origin: string;
    destination: string;
  };
  jeepneySnapshot: {
    code: string;
    plateNumber: string;
    capacity: number;
  };
}) => {
  const passengerId = toObjectId(params.passengerId);
  const scheduleId = toObjectId(params.scheduleId);

  const session = await mongoose.startSession();
  try {
    let createdBookingId: Types.ObjectId | null = null;

    await session.withTransaction(async () => {
      await reserveScheduleSeats({
        scheduleId,
        requestedSeats: params.requestedSeats,
        seatCapacity: params.seatCapacity,
        session,
      });

      let created = null;
      let attempts = 0;
      while (!created && attempts < 5) {
        attempts += 1;
        try {
          const inserted = await BookingModel.create(
            [
              {
                bookingRef: generateBookingRef(),
                passengerId,
                scheduleId,
                routeSnapshot: params.routeSnapshot,
                jeepneySnapshot: params.jeepneySnapshot,
                seats: params.requestedSeats,
                unitFare: params.unitFare,
                totalFare: params.unitFare * params.requestedSeats,
                status: "pending",
              },
            ],
            { session }
          );
          created = inserted[0];
        } catch (error: unknown) {
          const code = (error as { code?: number })?.code;
          if (code !== 11000) throw error;
        }
      }

      if (!created) {
        throw new AppError(500, "BOOKING_REF_GENERATION_FAILED", "Unable to generate booking reference");
      }

      createdBookingId = created._id as Types.ObjectId;
    });

    if (!createdBookingId) {
      throw new AppError(500, "BOOKING_CREATE_FAILED", "Unable to create booking");
    }

    const booking = await BookingModel.findById(createdBookingId).lean();
    if (!booking) {
      throw new AppError(500, "BOOKING_CREATE_FAILED", "Unable to load created booking");
    }

    return booking;
  } finally {
    await session.endSession();
  }
};
