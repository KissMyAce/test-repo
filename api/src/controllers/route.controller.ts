import { Request, Response } from "express";
import { FilterQuery, Types } from "mongoose";
import { Route, RouteModel } from "../models";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

const toRoutePayload = (route: {
  _id: { toString(): string };
  name: string;
  origin: string;
  destination: string;
  baseFare: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: route._id.toString(),
  name: route.name,
  origin: route.origin,
  destination: route.destination,
  baseFare: route.baseFare,
  isActive: route.isActive,
  createdAt: route.createdAt,
  updatedAt: route.updatedAt,
});

const ensureObjectId = (value: string, code: string, message: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(400, code, message);
  }
};

export const listRoutes = asyncHandler(async (req: Request, res: Response) => {
  const { search, isActive } = req.query as { search?: string; isActive?: boolean | string };

  const filter: FilterQuery<Route> = {};
  if (typeof isActive === "boolean") {
    filter.isActive = isActive;
  } else if (typeof isActive === "string" && (isActive === "true" || isActive === "false")) {
    filter.isActive = isActive === "true";
  }

  if (typeof search === "string" && search.trim()) {
    const pattern = new RegExp(search.trim(), "i");
    filter.$or = [{ name: pattern }, { origin: pattern }, { destination: pattern }];
  }

  const routes = await RouteModel.find(filter).sort({ name: 1, createdAt: -1 }).lean();

  res.status(200).json({
    routes: routes.map((route) => toRoutePayload(route)),
  });
});

export const getRouteById = asyncHandler(async (req: Request, res: Response) => {
  const { routeId } = req.params;
  ensureObjectId(routeId, "INVALID_ROUTE_ID", "Invalid route id");

  const route = await RouteModel.findById(routeId).lean();
  if (!route) {
    throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
  }

  res.status(200).json({ route: toRoutePayload(route) });
});

export const createRoute = asyncHandler(async (req: Request, res: Response) => {
  const { name, origin, destination, baseFare, isActive } = req.body as {
    name: string;
    origin: string;
    destination: string;
    baseFare?: number;
    isActive?: boolean;
  };

  const route = await RouteModel.create({
    name: name.trim(),
    origin: origin.trim(),
    destination: destination.trim(),
    baseFare: typeof baseFare === "number" ? baseFare : 0,
    isActive: typeof isActive === "boolean" ? isActive : true,
  });

  res.status(201).json({ route: toRoutePayload(route) });
});

export const updateRoute = asyncHandler(async (req: Request, res: Response) => {
  const { routeId } = req.params;
  ensureObjectId(routeId, "INVALID_ROUTE_ID", "Invalid route id");
  const { name, origin, destination, baseFare, isActive } = req.body as {
    name?: string;
    origin?: string;
    destination?: string;
    baseFare?: number;
    isActive?: boolean;
  };

  const route = await RouteModel.findById(routeId);
  if (!route) {
    throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
  }

  if (typeof name === "string" && name.trim()) route.name = name.trim();
  if (typeof origin === "string" && origin.trim()) route.origin = origin.trim();
  if (typeof destination === "string" && destination.trim()) route.destination = destination.trim();
  if (typeof baseFare === "number") route.baseFare = baseFare;
  if (typeof isActive === "boolean") route.isActive = isActive;

  await route.save();

  res.status(200).json({ route: toRoutePayload(route) });
});

export const deleteRoute = asyncHandler(async (req: Request, res: Response) => {
  const { routeId } = req.params;
  ensureObjectId(routeId, "INVALID_ROUTE_ID", "Invalid route id");

  const route = await RouteModel.findById(routeId);
  if (!route) {
    throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
  }

  route.isActive = false;
  await route.save();

  res.status(200).json({ message: "Route deactivated" });
});
