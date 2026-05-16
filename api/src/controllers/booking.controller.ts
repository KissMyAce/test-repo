import { Request, Response } from "express";
import mongoose, { FilterQuery, Types } from "mongoose";
import { Booking, BookingModel, JeepneyModel, RouteModel, ScheduleModel } from "../models";
import {
  createPendingBookingAtomic,
  movePendingSeatsToConfirmed,
  releaseConfirmedScheduleSeats,
  releasePendingScheduleSeats,
} from "../services/booking-seat.service";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

const toObjectId = (value: string, code: string, message: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(400, code, message);
  }
  return new Types.ObjectId(value);
};

const applyBookingFilters = (
  filter: FilterQuery<Booking>,
  query: {
    status?: "pending" | "confirmed" | "cancelled" | "failed_payment";
    bookingRef?: string;
    scheduleId?: string;
    from?: Date;
    to?: Date;
    passengerId?: string;
  }
) => {
  if (query.status) filter.status = query.status;
  if (query.bookingRef?.trim()) filter.bookingRef = new RegExp(query.bookingRef.trim(), "i");
  if (query.scheduleId) {
    filter.scheduleId = toObjectId(query.scheduleId, "INVALID_SCHEDULE_ID", "Invalid schedule id");
  }
  if (query.passengerId) {
    filter.passengerId = toObjectId(query.passengerId, "INVALID_PASSENGER_ID", "Invalid passenger id");
  }
  if (query.from || query.to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (query.from) createdAt.$gte = query.from;
    if (query.to) createdAt.$lte = query.to;
    filter.createdAt = createdAt;
  }
};

const getBookingQuery = () =>
  BookingModel.find()
    .populate("passengerId", "name email phone")
    .populate({
      path: "scheduleId",
      select: "departureAt arrivalAt status routeId jeepneyId",
      populate: [
        { path: "routeId", select: "name origin destination baseFare" },
        { path: "jeepneyId", select: "code plateNumber capacity status driverId" },
      ],
    });

const findBookingByIdHydrated = async (bookingId: Types.ObjectId) =>
  getBookingQuery().findOne({ _id: bookingId }).lean();

const findBookingOneHydrated = async (filter: FilterQuery<Booking>) =>
  getBookingQuery().findOne(filter).lean();

const findBookingsHydrated = async (filter: FilterQuery<Booking>) =>
  getBookingQuery().find(filter).sort({ createdAt: -1 }).lean();

const toBookingPayload = (booking: any) => ({
  id: booking._id.toString(),
  bookingRef: booking.bookingRef,
  seats: booking.seats,
  unitFare: booking.unitFare,
  totalFare: booking.totalFare,
  status: booking.status,
  cancelReason: booking.cancelReason || null,
  routeSnapshot: booking.routeSnapshot || null,
  jeepneySnapshot: booking.jeepneySnapshot || null,
  passenger: booking.passengerId
    ? {
        id: booking.passengerId._id?.toString(),
        name: booking.passengerId.name,
        email: booking.passengerId.email,
        phone: booking.passengerId.phone || null,
      }
    : null,
  schedule: booking.scheduleId
    ? {
        id: booking.scheduleId._id?.toString(),
        departureAt: booking.scheduleId.departureAt || null,
        arrivalAt: booking.scheduleId.arrivalAt || null,
        status: booking.scheduleId.status,
        route: booking.scheduleId.routeId
          ? {
              id: booking.scheduleId.routeId._id?.toString(),
              name: booking.scheduleId.routeId.name,
              origin: booking.scheduleId.routeId.origin,
              destination: booking.scheduleId.routeId.destination,
              baseFare: booking.scheduleId.routeId.baseFare,
            }
          : null,
        jeepney: booking.scheduleId.jeepneyId
          ? {
              id: booking.scheduleId.jeepneyId._id?.toString(),
              code: booking.scheduleId.jeepneyId.code,
              plateNumber: booking.scheduleId.jeepneyId.plateNumber,
              capacity: booking.scheduleId.jeepneyId.capacity,
              status: booking.scheduleId.jeepneyId.status,
            }
          : null,
      }
    : null,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
});

const transitionBookingStatus = async (params: {
  bookingId: Types.ObjectId;
  nextStatus: "pending" | "confirmed" | "cancelled" | "failed_payment";
  cancelReason?: string | null;
}) => {
  const session = await mongoose.startSession();
  try {
    let resultId: Types.ObjectId | null = null;

    await session.withTransaction(async () => {
      const booking = await BookingModel.findById(params.bookingId).session(session);
      if (!booking) {
        throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
      }

      const currentStatus = booking.status;
      const nextStatus = params.nextStatus;

      if (currentStatus === nextStatus) {
        if (typeof params.cancelReason === "string") {
          booking.cancelReason = params.cancelReason.trim() || null;
        }
        await booking.save({ session });
        resultId = booking._id as Types.ObjectId;
        return;
      }

      if (
        (currentStatus === "cancelled" || currentStatus === "failed_payment") &&
        (nextStatus === "pending" || nextStatus === "confirmed")
      ) {
        throw new AppError(400, "INVALID_STATUS_TRANSITION", "Cannot reactivate a closed booking");
      }

      if (currentStatus === "pending" && nextStatus === "confirmed") {
        await movePendingSeatsToConfirmed({
          scheduleId: booking.scheduleId as Types.ObjectId,
          seats: booking.seats,
          session,
        });
      } else if (currentStatus === "pending" && (nextStatus === "cancelled" || nextStatus === "failed_payment")) {
        await releasePendingScheduleSeats({
          scheduleId: booking.scheduleId as Types.ObjectId,
          seats: booking.seats,
          session,
        });
      } else if (
        currentStatus === "confirmed" &&
        (nextStatus === "cancelled" || nextStatus === "failed_payment")
      ) {
        await releaseConfirmedScheduleSeats({
          scheduleId: booking.scheduleId as Types.ObjectId,
          seats: booking.seats,
          session,
        });
      } else {
        throw new AppError(400, "INVALID_STATUS_TRANSITION", "Unsupported booking status transition");
      }

      booking.status = nextStatus;
      if (typeof params.cancelReason === "string") {
        booking.cancelReason = params.cancelReason.trim() || null;
      } else if (nextStatus !== "cancelled") {
        booking.cancelReason = null;
      }
      await booking.save({ session });
      resultId = booking._id as Types.ObjectId;
    });

    if (!resultId) {
      throw new AppError(500, "BOOKING_UPDATE_FAILED", "Unable to update booking");
    }

    const updated = await findBookingByIdHydrated(resultId);
    if (!updated) {
      throw new AppError(500, "BOOKING_UPDATE_FAILED", "Unable to load updated booking");
    }
    return updated;
  } finally {
    await session.endSession();
  }
};

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { scheduleId, seats } = req.body as { scheduleId: string; seats: number };

  const schedule = await ScheduleModel.findById(
    toObjectId(scheduleId, "INVALID_SCHEDULE_ID", "Invalid schedule id")
  ).lean();
  if (!schedule) {
    throw new AppError(404, "SCHEDULE_NOT_FOUND", "Schedule not found");
  }
  if (schedule.status !== "scheduled") {
    throw new AppError(400, "SCHEDULE_NOT_BOOKABLE", "Only scheduled trips can be booked");
  }
  if (new Date(schedule.departureAt).getTime() <= Date.now()) {
    throw new AppError(400, "SCHEDULE_DEPARTED", "Cannot book a departed schedule");
  }

  const [route, jeepney] = await Promise.all([
    RouteModel.findById(schedule.routeId).select("name origin destination baseFare").lean(),
    JeepneyModel.findById(schedule.jeepneyId).select("code plateNumber capacity").lean(),
  ]);
  if (!route || !jeepney) {
    throw new AppError(400, "SCHEDULE_RELATION_INVALID", "Schedule references invalid route/jeepney");
  }

  const created = await createPendingBookingAtomic({
    passengerId: req.authUser.id,
    scheduleId: schedule._id as Types.ObjectId,
    requestedSeats: seats,
    seatCapacity: jeepney.capacity,
    unitFare: route.baseFare,
    routeSnapshot: {
      name: route.name,
      origin: route.origin,
      destination: route.destination,
    },
    jeepneySnapshot: {
      code: jeepney.code,
      plateNumber: jeepney.plateNumber,
      capacity: jeepney.capacity,
    },
  });

  const hydrated = await findBookingByIdHydrated(created._id as Types.ObjectId);
  if (!hydrated) {
    throw new AppError(500, "BOOKING_CREATE_FAILED", "Unable to load created booking");
  }

  res.status(201).json({ booking: toBookingPayload(hydrated) });
});

export const listMyBookings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const query = req.query as {
    status?: "pending" | "confirmed" | "cancelled" | "failed_payment";
    bookingRef?: string;
    scheduleId?: string;
    from?: Date;
    to?: Date;
  };

  const filter: FilterQuery<Booking> = {
    passengerId: new Types.ObjectId(req.authUser.id),
  };
  applyBookingFilters(filter, query);

  const bookings = await findBookingsHydrated(filter);
  res.status(200).json({ bookings: bookings.map((booking) => toBookingPayload(booking)) });
});

export const getMyBookingById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const bookingId = toObjectId(req.params.bookingId, "INVALID_BOOKING_ID", "Invalid booking id");
  const booking = await findBookingOneHydrated({
    _id: bookingId,
    passengerId: new Types.ObjectId(req.authUser.id),
  });

  if (!booking) {
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  res.status(200).json({ booking: toBookingPayload(booking) });
});

export const cancelMyBooking = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const bookingId = toObjectId(req.params.bookingId, "INVALID_BOOKING_ID", "Invalid booking id");
  const existing = await BookingModel.findOne({
    _id: bookingId,
    passengerId: new Types.ObjectId(req.authUser.id),
  }).select("_id");

  if (!existing) {
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  const updated = await transitionBookingStatus({
    bookingId,
    nextStatus: "cancelled",
    cancelReason: req.body?.reason,
  });

  res.status(200).json({ booking: toBookingPayload(updated) });
});

export const listAdminBookings = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as {
    status?: "pending" | "confirmed" | "cancelled" | "failed_payment";
    bookingRef?: string;
    scheduleId?: string;
    passengerId?: string;
    from?: Date;
    to?: Date;
  };

  const filter: FilterQuery<Booking> = {};
  applyBookingFilters(filter, query);

  const bookings = await findBookingsHydrated(filter);
  res.status(200).json({ bookings: bookings.map((booking) => toBookingPayload(booking)) });
});

export const updateAdminBooking = asyncHandler(async (req: Request, res: Response) => {
  const bookingId = toObjectId(req.params.bookingId, "INVALID_BOOKING_ID", "Invalid booking id");
  const { status, cancelReason } = req.body as {
    status?: "pending" | "confirmed" | "cancelled" | "failed_payment";
    cancelReason?: string;
  };

  if (!status) {
    const booking = await findBookingByIdHydrated(bookingId);
    if (!booking) {
      throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }
    if (typeof cancelReason === "string") {
      await BookingModel.findByIdAndUpdate(bookingId, {
        $set: { cancelReason: cancelReason.trim() || null },
      });
      const updated = await findBookingByIdHydrated(bookingId);
      if (!updated) {
        throw new AppError(500, "BOOKING_UPDATE_FAILED", "Unable to update booking");
      }
      return res.status(200).json({ booking: toBookingPayload(updated) });
    }
    return res.status(200).json({ booking: toBookingPayload(booking) });
  }

  const updated = await transitionBookingStatus({
    bookingId,
    nextStatus: status,
    cancelReason,
  });
  res.status(200).json({ booking: toBookingPayload(updated) });
});

export const listDriverBookings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const query = req.query as {
    status?: "pending" | "confirmed" | "cancelled" | "failed_payment";
    bookingRef?: string;
    scheduleId?: string;
    from?: Date;
    to?: Date;
  };

  const jeepneys = await JeepneyModel.find({
    driverId: new Types.ObjectId(req.authUser.id),
  })
    .select("_id")
    .lean();

  if (jeepneys.length === 0) {
    return res.status(200).json({ bookings: [] });
  }

  const schedules = await ScheduleModel.find({
    jeepneyId: { $in: jeepneys.map((jeepney) => jeepney._id) },
  })
    .select("_id")
    .lean();

  if (schedules.length === 0) {
    return res.status(200).json({ bookings: [] });
  }

  const filter: FilterQuery<Booking> = {
    scheduleId: { $in: schedules.map((schedule) => schedule._id) },
  };
  applyBookingFilters(filter, query);

  const bookings = await findBookingsHydrated(filter);
  res.status(200).json({ bookings: bookings.map((booking) => toBookingPayload(booking)) });
});
