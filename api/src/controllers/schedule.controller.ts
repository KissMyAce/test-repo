import { Request, Response } from "express";
import { FilterQuery, Types } from "mongoose";
import {
  Jeepney,
  JeepneyModel,
  RouteModel,
  Schedule,
  ScheduleModel,
  ScheduleStatus,
} from "../models";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

const isScheduleStatus = (value: unknown): value is ScheduleStatus =>
  value === "scheduled" || value === "completed" || value === "cancelled";

const toObjectId = (value: string, code: string, message: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(400, code, message);
  }
  return new Types.ObjectId(value);
};

const parseDateTime = (value: string | Date, code: string, message: string) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, code, message);
  }
  return parsed;
};

const parseDateOnly = (dateText: string) => {
  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, "INVALID_DATE", "date must be a valid YYYY-MM-DD value");
  }
  return parsed;
};

const ensureRouteExists = async (routeId: string) => {
  const route = await RouteModel.findById(routeId).select("_id").lean();
  if (!route) {
    throw new AppError(400, "INVALID_ROUTE_ID", "Route does not exist");
  }
  return route;
};

const ensureJeepneyExists = async (jeepneyId: string) => {
  const jeepney = await JeepneyModel.findById(jeepneyId)
    .select("_id routeId driverId capacity status")
    .lean();

  if (!jeepney) {
    throw new AppError(400, "INVALID_JEEPNEY_ID", "Jeepney does not exist");
  }

  return jeepney;
};

const ensureJeepneyRouteMatch = async (jeepneyRouteId: Types.ObjectId, routeId: string | Types.ObjectId) => {
  // Allow either the same route or the reverse directional route (origin/destination swapped)
  const routeObjectId = typeof routeId === "string" ? toObjectId(routeId, "INVALID_ROUTE_ID", "Invalid routeId") : routeId;

  const [assignedRoute, selectedRoute] = await Promise.all([
    RouteModel.findById(jeepneyRouteId).select("_id origin destination").lean(),
    RouteModel.findById(routeObjectId).select("_id origin destination").lean(),
  ]);

  if (!assignedRoute || !selectedRoute) {
    throw new AppError(400, "INVALID_ROUTE_ID", "Route does not exist");
  }

  const same = (assignedRoute._id as any).toString() === (selectedRoute._id as any).toString();
  const reverse = assignedRoute.origin === selectedRoute.destination && assignedRoute.destination === selectedRoute.origin;

  if (!same && !reverse) {
    throw new AppError(
      400,
      "ROUTE_JEEPNEY_MISMATCH",
      "Selected route must match the assigned route of the jeepney"
    );
  }
};

const toSchedulePayload = (schedule: {
  _id: { toString(): string };
  departureAt: Date;
  arrivalAt: Date;
  status: ScheduleStatus;
  pendingBookedSeats?: number;
  confirmedBookedSeats?: number;
  createdAt?: Date;
  updatedAt?: Date;
  jeepneyId?: {
    _id?: { toString(): string };
    code?: string;
    plateNumber?: string;
    capacity?: number;
    status?: "active" | "inactive";
  } | null;
  routeId?: {
    _id?: { toString(): string };
    name?: string;
    origin?: string;
    destination?: string;
  } | null;
}) => {
  const jeepneyCapacity = schedule.jeepneyId?.capacity ?? 0;
  const pendingBookingsCount = schedule.pendingBookedSeats ?? 0;
  const confirmedBookingsCount = schedule.confirmedBookedSeats ?? 0;
  const availableSeats = Math.max(
    0,
    jeepneyCapacity - (pendingBookingsCount + confirmedBookingsCount)
  );

  return {
    id: schedule._id.toString(),
    departureAt: schedule.departureAt,
    arrivalAt: schedule.arrivalAt,
    status: schedule.status,
    availableSeats,
    confirmedBookingsCount,
    jeepney: schedule.jeepneyId
      ? {
          id: schedule.jeepneyId._id?.toString(),
          code: schedule.jeepneyId.code,
          plateNumber: schedule.jeepneyId.plateNumber,
          capacity: schedule.jeepneyId.capacity,
          status: schedule.jeepneyId.status,
        }
      : null,
    route: schedule.routeId
      ? {
          id: schedule.routeId._id?.toString(),
          name: schedule.routeId.name,
          origin: schedule.routeId.origin,
          destination: schedule.routeId.destination,
        }
      : null,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
};

const applyScheduleFilters = (
  filter: FilterQuery<Schedule>,
  query: {
    routeId?: string;
    jeepneyId?: string;
    status?: string;
    date?: string;
    departureFrom?: string;
    departureTo?: string;
  },
  options?: {
    defaultStatus?: ScheduleStatus;
    forceJeepneyId?: Types.ObjectId;
  }
) => {
  if (options?.forceJeepneyId) {
    filter.jeepneyId = options.forceJeepneyId;
  } else if (query.jeepneyId) {
    filter.jeepneyId = toObjectId(query.jeepneyId, "INVALID_JEEPNEY_ID", "Invalid jeepneyId");
  }

  if (query.routeId) {
    filter.routeId = toObjectId(query.routeId, "INVALID_ROUTE_ID", "Invalid routeId");
  }

  if (query.status) {
    if (!isScheduleStatus(query.status)) {
      throw new AppError(400, "INVALID_STATUS", "Invalid schedule status");
    }
    filter.status = query.status;
  } else if (options?.defaultStatus) {
    filter.status = options.defaultStatus;
  }

  if (query.date) {
    const dayStart = parseDateOnly(query.date);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    filter.departureAt = { $gte: dayStart, $lt: dayEnd };
    return;
  }

  if (query.departureFrom || query.departureTo) {
    const departureAtFilter: { $gte?: Date; $lte?: Date } = {};

    if (query.departureFrom) {
      departureAtFilter.$gte = parseDateTime(
        query.departureFrom,
        "INVALID_DEPARTURE_FROM",
        "Invalid departureFrom value"
      );
    }

    if (query.departureTo) {
      departureAtFilter.$lte = parseDateTime(
        query.departureTo,
        "INVALID_DEPARTURE_TO",
        "Invalid departureTo value"
      );
    }

    filter.departureAt = departureAtFilter;
  }
};

const getDriverJeepney = async (driverId: string) => {
  const jeepney = await JeepneyModel.findOne({ driverId: new Types.ObjectId(driverId) })
    .select("_id routeId")
    .lean();

  if (!jeepney) {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "No jeepney assigned to this driver");
  }

  return jeepney;
};

const getScheduleByIdOrFail = async (scheduleId: string) => {
  const schedule = await ScheduleModel.findById(scheduleId)
    .populate("jeepneyId", "code plateNumber capacity status")
    .populate("routeId", "name origin destination")
    .lean();

  if (!schedule) {
    throw new AppError(404, "SCHEDULE_NOT_FOUND", "Schedule not found");
  }

  return schedule;
};

export const listSchedules = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as {
    routeId?: string;
    jeepneyId?: string;
    status?: string;
    date?: string;
    departureFrom?: string;
    departureTo?: string;
  };

  const filter: FilterQuery<Schedule> = {};
  applyScheduleFilters(filter, query, { defaultStatus: "scheduled" });

  const schedules = await ScheduleModel.find(filter)
    .sort({ departureAt: 1, createdAt: -1 })
    .populate("jeepneyId", "code plateNumber capacity status")
    .populate("routeId", "name origin destination")
    .lean();

  res.status(200).json({ schedules: schedules.map((schedule) => toSchedulePayload(schedule)) });
});

export const getScheduleById = asyncHandler(async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  toObjectId(scheduleId, "INVALID_SCHEDULE_ID", "Invalid schedule id");
  const schedule = await getScheduleByIdOrFail(scheduleId);
  res.status(200).json({ schedule: toSchedulePayload(schedule) });
});

export const listAdminSchedules = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as {
    routeId?: string;
    jeepneyId?: string;
    status?: string;
    date?: string;
    departureFrom?: string;
    departureTo?: string;
  };

  const filter: FilterQuery<Schedule> = {};
  applyScheduleFilters(filter, query);

  const schedules = await ScheduleModel.find(filter)
    .sort({ departureAt: 1, createdAt: -1 })
    .populate("jeepneyId", "code plateNumber capacity status")
    .populate("routeId", "name origin destination")
    .lean();

  res.status(200).json({ schedules: schedules.map((schedule) => toSchedulePayload(schedule)) });
});

export const createSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { jeepneyId, routeId, departureAt, arrivalAt, status } = req.body as {
    jeepneyId: string;
    routeId: string;
    departureAt: string | Date;
    arrivalAt: string | Date;
    status?: ScheduleStatus;
  };

  const route = await ensureRouteExists(routeId);
  const jeepney = await ensureJeepneyExists(jeepneyId);
  await ensureJeepneyRouteMatch(jeepney.routeId as Types.ObjectId, route._id);

  const parsedDeparture = parseDateTime(
    departureAt,
    "INVALID_DEPARTURE_AT",
    "Invalid departureAt value"
  );
  const parsedArrival = parseDateTime(arrivalAt, "INVALID_ARRIVAL_AT", "Invalid arrivalAt value");

  if (parsedArrival.getTime() <= parsedDeparture.getTime()) {
    throw new AppError(400, "INVALID_TIME_RANGE", "arrivalAt must be later than departureAt");
  }

  const schedule = await ScheduleModel.create({
    jeepneyId: toObjectId(jeepneyId, "INVALID_JEEPNEY_ID", "Invalid jeepneyId"),
    routeId: toObjectId(routeId, "INVALID_ROUTE_ID", "Invalid routeId"),
    departureAt: parsedDeparture,
    arrivalAt: parsedArrival,
    status: status || "scheduled",
  });

  const populated = await getScheduleByIdOrFail((schedule._id as Types.ObjectId).toString());
  res.status(201).json({ schedule: toSchedulePayload(populated) });
});

export const updateSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  toObjectId(scheduleId, "INVALID_SCHEDULE_ID", "Invalid schedule id");
  const { jeepneyId, routeId, departureAt, arrivalAt, status } = req.body as {
    jeepneyId?: string;
    routeId?: string;
    departureAt?: string | Date;
    arrivalAt?: string | Date;
    status?: ScheduleStatus;
  };

  const schedule = await ScheduleModel.findById(scheduleId);
  if (!schedule) {
    throw new AppError(404, "SCHEDULE_NOT_FOUND", "Schedule not found");
  }

  let nextJeepneyRouteId = schedule.routeId as Types.ObjectId;

  if (jeepneyId) {
    const jeepney = await ensureJeepneyExists(jeepneyId);
    schedule.jeepneyId = toObjectId(jeepneyId, "INVALID_JEEPNEY_ID", "Invalid jeepneyId");
    nextJeepneyRouteId = jeepney.routeId as Types.ObjectId;
  }

  let nextRouteId = schedule.routeId as Types.ObjectId;
  if (routeId) {
    const route = await ensureRouteExists(routeId);
    schedule.routeId = toObjectId(routeId, "INVALID_ROUTE_ID", "Invalid routeId");
    nextRouteId = route._id as Types.ObjectId;
  }

  await ensureJeepneyRouteMatch(nextJeepneyRouteId, nextRouteId);

  if (departureAt) {
    schedule.departureAt = parseDateTime(
      departureAt,
      "INVALID_DEPARTURE_AT",
      "Invalid departureAt value"
    );
  }
  if (arrivalAt) {
    schedule.arrivalAt = parseDateTime(arrivalAt, "INVALID_ARRIVAL_AT", "Invalid arrivalAt value");
  }
  if (status && isScheduleStatus(status)) {
    schedule.status = status;
  }

  if (schedule.arrivalAt.getTime() <= schedule.departureAt.getTime()) {
    throw new AppError(400, "INVALID_TIME_RANGE", "arrivalAt must be later than departureAt");
  }

  await schedule.save();

  const populated = await getScheduleByIdOrFail(scheduleId);
  res.status(200).json({ schedule: toSchedulePayload(populated) });
});

export const deleteSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  toObjectId(scheduleId, "INVALID_SCHEDULE_ID", "Invalid schedule id");
  const schedule = await ScheduleModel.findById(scheduleId);

  if (!schedule) {
    throw new AppError(404, "SCHEDULE_NOT_FOUND", "Schedule not found");
  }

  await schedule.deleteOne();
  res.status(200).json({ message: "Schedule deleted" });
});

export const listMySchedules = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const query = req.query as {
    routeId?: string;
    status?: string;
    date?: string;
    departureFrom?: string;
    departureTo?: string;
  };

  const driverJeepney = await getDriverJeepney(req.authUser.id);

  const filter: FilterQuery<Schedule> = {};
  applyScheduleFilters(filter, query, {
    forceJeepneyId: driverJeepney._id as Types.ObjectId,
  });

  const schedules = await ScheduleModel.find(filter)
    .sort({ departureAt: 1, createdAt: -1 })
    .populate("jeepneyId", "code plateNumber capacity status")
    .populate("routeId", "name origin destination")
    .lean();

  res.status(200).json({ schedules: schedules.map((schedule) => toSchedulePayload(schedule)) });
});

export const createMySchedule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { jeepneyId, routeId, departureAt, arrivalAt, status } = req.body as {
    jeepneyId?: string;
    routeId: string;
    departureAt: string | Date;
    arrivalAt: string | Date;
    status?: ScheduleStatus;
  };

  const driverJeepney = await getDriverJeepney(req.authUser.id);

  if (jeepneyId && jeepneyId !== (driverJeepney._id as Types.ObjectId).toString()) {
    throw new AppError(403, "FORBIDDEN", "Drivers can only manage schedules for their own jeepney");
  }

  const route = await ensureRouteExists(routeId);
  await ensureJeepneyRouteMatch(driverJeepney.routeId as Types.ObjectId, route._id);

  const parsedDeparture = parseDateTime(
    departureAt,
    "INVALID_DEPARTURE_AT",
    "Invalid departureAt value"
  );
  const parsedArrival = parseDateTime(arrivalAt, "INVALID_ARRIVAL_AT", "Invalid arrivalAt value");

  if (parsedArrival.getTime() <= parsedDeparture.getTime()) {
    throw new AppError(400, "INVALID_TIME_RANGE", "arrivalAt must be later than departureAt");
  }

  const schedule = await ScheduleModel.create({
    jeepneyId: driverJeepney._id,
    routeId: route._id,
    departureAt: parsedDeparture,
    arrivalAt: parsedArrival,
    status: status || "scheduled",
  });

  const populated = await getScheduleByIdOrFail((schedule._id as Types.ObjectId).toString());
  res.status(201).json({ schedule: toSchedulePayload(populated) });
});

export const updateMySchedule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { scheduleId } = req.params;
  const { routeId, departureAt, arrivalAt, status } = req.body as {
    routeId?: string;
    departureAt?: string | Date;
    arrivalAt?: string | Date;
    status?: ScheduleStatus;
  };

  const driverJeepney = await getDriverJeepney(req.authUser.id);

  const schedule = await ScheduleModel.findOne({
    _id: toObjectId(scheduleId, "INVALID_SCHEDULE_ID", "Invalid scheduleId"),
    jeepneyId: driverJeepney._id,
  });

  if (!schedule) {
    throw new AppError(404, "SCHEDULE_NOT_FOUND", "Schedule not found");
  }

  if (routeId) {
    const route = await ensureRouteExists(routeId);
    await ensureJeepneyRouteMatch(driverJeepney.routeId as Types.ObjectId, route._id);
    schedule.routeId = route._id as Types.ObjectId;
  }

  if (departureAt) {
    schedule.departureAt = parseDateTime(
      departureAt,
      "INVALID_DEPARTURE_AT",
      "Invalid departureAt value"
    );
  }

  if (arrivalAt) {
    schedule.arrivalAt = parseDateTime(arrivalAt, "INVALID_ARRIVAL_AT", "Invalid arrivalAt value");
  }

  if (status && isScheduleStatus(status)) {
    schedule.status = status;
  }

  if (schedule.arrivalAt.getTime() <= schedule.departureAt.getTime()) {
    throw new AppError(400, "INVALID_TIME_RANGE", "arrivalAt must be later than departureAt");
  }

  await schedule.save();

  const populated = await getScheduleByIdOrFail(scheduleId);
  res.status(200).json({ schedule: toSchedulePayload(populated) });
});

export const deleteMySchedule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { scheduleId } = req.params;

  const driverJeepney = await getDriverJeepney(req.authUser.id);

  const schedule = await ScheduleModel.findOne({
    _id: toObjectId(scheduleId, "INVALID_SCHEDULE_ID", "Invalid scheduleId"),
    jeepneyId: driverJeepney._id,
  });

  if (!schedule) {
    throw new AppError(404, "SCHEDULE_NOT_FOUND", "Schedule not found");
  }

  await schedule.deleteOne();
  res.status(200).json({ message: "Schedule deleted" });
});
