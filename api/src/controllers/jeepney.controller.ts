import { Request, Response } from "express";
import { FilterQuery, Types } from "mongoose";
import { Jeepney, JeepneyModel, RouteModel, UserModel, DriverProfileModel } from "../models";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { getPublicObjectUrl } from "../utils/object-url";

const toJeepneyPayload = (jeepney: {
  _id: { toString(): string };
  code: string;
  plateNumber: string;
  capacity: number;
  status: "active" | "inactive";
  photoKey?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  routeId?: {
    _id?: { toString(): string };
    name?: string;
    origin?: string;
    destination?: string;
  } | null;
  driverId?: {
    _id?: { toString(): string };
    name?: string;
    email?: string;
    phone?: string | null;
  } | null;
}) => ({
  id: jeepney._id.toString(),
  code: jeepney.code,
  plateNumber: jeepney.plateNumber,
  capacity: jeepney.capacity,
  status: jeepney.status,
  photoKey: jeepney.photoKey || null,
  photoUrl: getPublicObjectUrl(jeepney.photoKey || null),
  route: jeepney.routeId
    ? {
        id: jeepney.routeId._id?.toString(),
        name: jeepney.routeId.name,
        origin: jeepney.routeId.origin,
        destination: jeepney.routeId.destination,
      }
    : null,
  driver: jeepney.driverId
    ? {
        id: jeepney.driverId._id?.toString(),
        name: jeepney.driverId.name,
        email: jeepney.driverId.email,
        phone: jeepney.driverId.phone || null,
      }
    : null,
  createdAt: jeepney.createdAt,
  updatedAt: jeepney.updatedAt,
});

const ensureObjectId = (value: string, code: string, message: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(400, code, message);
  }
};

const ensureRouteExists = async (routeId: string) => {
  const route = await RouteModel.findById(routeId).select("_id isActive");
  if (!route) {
    throw new AppError(400, "INVALID_ROUTE_ID", "Route does not exist");
  }
  return route;
};

const ensureDriverExists = async (driverId: string) => {
  const driver = await UserModel.findById(driverId).select("_id role");
  if (!driver || driver.role !== "driver") {
    throw new AppError(400, "INVALID_DRIVER_ID", "Driver does not exist");
  }
  return driver;
};

export const listJeepneys = asyncHandler(async (req: Request, res: Response) => {
  const { filter } = buildJeepneyFilter(req.query as {
    search?: string;
    routeId?: string;
    driverId?: string;
    status?: "active" | "inactive";
  }, true);

  const jeepneys = await JeepneyModel.find(filter)
    .sort({ createdAt: -1 })
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  // Load driver profiles to surface license numbers alongside driver info
  const driverIds = jeepneys
    .map((j) => (j.driverId && typeof j.driverId === "object" ? (j.driverId as any)._id?.toString() : j.driverId))
    .filter(Boolean) as string[];

  const driverProfiles =
    driverIds.length > 0
      ? await DriverProfileModel.find({ userId: { $in: driverIds.map((id) => new Types.ObjectId(id)) } }).lean()
      : [];

  const profileMap = new Map(driverProfiles.map((p) => [p.userId?.toString(), p]));

  res.status(200).json({
    jeepneys: jeepneys.map((jeepney) => {
      const payload = toJeepneyPayload(jeepney as any);
      const driverId = jeepney.driverId && typeof jeepney.driverId === "object" ? (jeepney.driverId as any)._1?._id?.toString() : jeepney.driverId;
      // fallback: previous line had a typo; compute properly
      const drvId = jeepney.driverId && typeof jeepney.driverId === "object" ? (jeepney.driverId as any)._id?.toString() : jeepney.driverId;
      const profile = drvId ? profileMap.get(drvId) : null;
      if (payload.driver) {
        (payload.driver as any).licenseNumber = profile?.licenseNumber || null;
      }
      return payload;
    }),
  });
});

const buildJeepneyFilter = (
  query: {
    search?: string;
    routeId?: string;
    driverId?: string;
    status?: "active" | "inactive";
  },
  defaultActiveOnly: boolean
) => {
  const { search, routeId, driverId, status } = query;
  const filter: FilterQuery<Jeepney> = {};

  if (status) {
    filter.status = status;
  } else if (defaultActiveOnly) {
    filter.status = "active";
  }

  if (routeId) {
    ensureObjectId(routeId, "INVALID_ROUTE_ID", "Invalid routeId");
    filter.routeId = new Types.ObjectId(routeId);
  }
  if (driverId) {
    ensureObjectId(driverId, "INVALID_DRIVER_ID", "Invalid driverId");
    filter.driverId = new Types.ObjectId(driverId);
  }
  if (search?.trim()) {
    const pattern = new RegExp(search.trim(), "i");
    filter.$or = [{ code: pattern }, { plateNumber: pattern }];
  }

  return { filter };
};

export const listAdminJeepneys = asyncHandler(async (req: Request, res: Response) => {
  const { search, routeId, driverId, status } = req.query as {
    search?: string;
    routeId?: string;
    driverId?: string;
    status?: "active" | "inactive";
  };

  const { filter } = buildJeepneyFilter({ search, routeId, driverId, status }, false);

  const jeepneys = await JeepneyModel.find(filter)
    .sort({ createdAt: -1 })
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  // Attach driver license numbers from DriverProfileModel
  const driverIds = jeepneys
    .map((j) => (j.driverId && typeof j.driverId === "object" ? (j.driverId as any)._id?.toString() : j.driverId))
    .filter(Boolean) as string[];

  const driverProfiles =
    driverIds.length > 0
      ? await DriverProfileModel.find({ userId: { $in: driverIds.map((id) => new Types.ObjectId(id)) } }).lean()
      : [];

  const profileMap = new Map(driverProfiles.map((p) => [p.userId?.toString(), p]));

  res.status(200).json({
    jeepneys: jeepneys.map((jeepney) => {
      const payload = toJeepneyPayload(jeepney as any);
      const drvId = jeepney.driverId && typeof jeepney.driverId === "object" ? (jeepney.driverId as any)._id?.toString() : jeepney.driverId;
      const profile = drvId ? profileMap.get(drvId) : null;
      if (payload.driver) {
        (payload.driver as any).licenseNumber = profile?.licenseNumber || null;
      }
      return payload;
    }),
  });
});

export const getJeepneyById = asyncHandler(async (req: Request, res: Response) => {
  const { jeepneyId } = req.params;
  ensureObjectId(jeepneyId, "INVALID_JEEPNEY_ID", "Invalid jeepney id");
  const jeepney = await JeepneyModel.findById(jeepneyId)
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  if (!jeepney) {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "Jeepney not found");
  }

  res.status(200).json({ jeepney: toJeepneyPayload(jeepney) });
});

export const createJeepney = asyncHandler(async (req: Request, res: Response) => {
  const { code, plateNumber, routeId, driverId, capacity, status, photoKey } = req.body as {
    code: string;
    plateNumber: string;
    routeId: string;
    driverId: string;
    capacity: number;
    status?: "active" | "inactive";
    photoKey?: string;
  };

  await ensureRouteExists(routeId);
  await ensureDriverExists(driverId);

  const jeepney = await JeepneyModel.create({
    code: code.trim(),
    plateNumber: plateNumber.trim(),
    routeId: new Types.ObjectId(routeId),
    driverId: new Types.ObjectId(driverId),
    capacity,
    status: status || "active",
    photoKey: photoKey?.trim() || null,
  });

  const populated = await JeepneyModel.findById(jeepney._id)
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  res.status(201).json({ jeepney: toJeepneyPayload(populated || jeepney) });
});

export const updateJeepney = asyncHandler(async (req: Request, res: Response) => {
  const { jeepneyId } = req.params;
  ensureObjectId(jeepneyId, "INVALID_JEEPNEY_ID", "Invalid jeepney id");
  const { code, plateNumber, routeId, driverId, capacity, status, photoKey } = req.body as {
    code?: string;
    plateNumber?: string;
    routeId?: string;
    driverId?: string;
    capacity?: number;
    status?: "active" | "inactive";
    photoKey?: string | null;
  };

  const jeepney = await JeepneyModel.findById(jeepneyId);
  if (!jeepney) {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "Jeepney not found");
  }

  if (routeId) {
    await ensureRouteExists(routeId);
    jeepney.routeId = new Types.ObjectId(routeId);
  }
  if (driverId) {
    await ensureDriverExists(driverId);
    jeepney.driverId = new Types.ObjectId(driverId);
  }
  if (typeof code === "string" && code.trim()) jeepney.code = code.trim();
  if (typeof plateNumber === "string" && plateNumber.trim()) jeepney.plateNumber = plateNumber.trim();
  if (typeof capacity === "number") jeepney.capacity = capacity;
  if (typeof status === "string") jeepney.status = status;
  if (typeof photoKey === "string") jeepney.photoKey = photoKey.trim() || null;
  if (photoKey === null) jeepney.photoKey = null;

  await jeepney.save();

  const populated = await JeepneyModel.findById(jeepney._id)
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  res.status(200).json({ jeepney: toJeepneyPayload(populated || jeepney) });
});

export const deleteJeepney = asyncHandler(async (req: Request, res: Response) => {
  const { jeepneyId } = req.params;
  ensureObjectId(jeepneyId, "INVALID_JEEPNEY_ID", "Invalid jeepney id");
  const jeepney = await JeepneyModel.findById(jeepneyId);
  if (!jeepney) {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "Jeepney not found");
  }

  jeepney.status = "inactive";
  await jeepney.save();

  res.status(200).json({ message: "Jeepney deactivated" });
});

export const getMyJeepney = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const jeepney = await JeepneyModel.findOne({ driverId: new Types.ObjectId(req.authUser.id) })
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  if (!jeepney) {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "No jeepney assigned to this driver");
  }

  res.status(200).json({ jeepney: toJeepneyPayload(jeepney) });
});

export const updateMyJeepney = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { code, plateNumber, routeId, capacity, photoKey } = req.body as {
    code?: string;
    plateNumber?: string;
    routeId?: string;
    capacity?: number;
    photoKey?: string | null;
  };

  const jeepney = await JeepneyModel.findOne({ driverId: new Types.ObjectId(req.authUser.id) });
  if (!jeepney) {
    throw new AppError(404, "JEEPNEY_NOT_FOUND", "No jeepney assigned to this driver");
  }

  if (routeId) {
    await ensureRouteExists(routeId);
    jeepney.routeId = new Types.ObjectId(routeId);
  }
  if (typeof code === "string" && code.trim()) jeepney.code = code.trim();
  if (typeof plateNumber === "string" && plateNumber.trim()) jeepney.plateNumber = plateNumber.trim();
  if (typeof capacity === "number") jeepney.capacity = capacity;
  if (typeof photoKey === "string") jeepney.photoKey = photoKey.trim() || null;
  if (photoKey === null) jeepney.photoKey = null;

  await jeepney.save();

  const populated = await JeepneyModel.findById(jeepney._id)
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  res.status(200).json({ jeepney: toJeepneyPayload(populated || jeepney) });
});

export const createMyJeepney = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { code, plateNumber, routeId, capacity, photoKey } = req.body as {
    code: string;
    plateNumber: string;
    routeId: string;
    capacity: number;
    photoKey?: string;
  };

  await ensureRouteExists(routeId);

  // create jeepney record assigned to this driver, default to inactive so admin approves
  const jeepney = await JeepneyModel.create({
    code: code.trim(),
    plateNumber: plateNumber.trim(),
    routeId: new Types.ObjectId(routeId),
    driverId: new Types.ObjectId(req.authUser.id),
    capacity,
    status: "inactive",
    photoKey: photoKey?.trim() || null,
  });

  const populated = await JeepneyModel.findById(jeepney._id)
    .populate("routeId", "name origin destination")
    .populate("driverId", "name email phone")
    .lean();

  res.status(201).json({ jeepney: toJeepneyPayload(populated || jeepney) });
});
