import { z } from "zod";

const jeepneyStatusSchema = z.enum(["active", "inactive"]);
const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id format");

export const listJeepneysSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    search: z.string().trim().min(1).optional(),
    routeId: objectIdSchema.optional(),
    driverId: objectIdSchema.optional(),
    status: jeepneyStatusSchema.optional(),
  }),
});

export const getJeepneyByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    jeepneyId: objectIdSchema,
  }),
  query: z.object({}),
});

export const createJeepneySchema = z.object({
  body: z.object({
    code: z.string().min(1),
    plateNumber: z.string().min(1),
    routeId: objectIdSchema,
    driverId: objectIdSchema,
    capacity: z.number().int().min(1).max(40),
    status: jeepneyStatusSchema.optional(),
    photoKey: z.string().min(1).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateJeepneySchema = z.object({
  body: z
    .object({
      code: z.string().min(1).optional(),
      plateNumber: z.string().min(1).optional(),
      routeId: objectIdSchema.optional(),
      driverId: objectIdSchema.optional(),
      capacity: z.number().int().min(1).max(40).optional(),
      status: jeepneyStatusSchema.optional(),
      photoKey: z.string().min(1).nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
  params: z.object({
    jeepneyId: objectIdSchema,
  }),
  query: z.object({}),
});

export const updateMyJeepneySchema = z.object({
  body: z
    .object({
      code: z.string().min(1).optional(),
      plateNumber: z.string().min(1).optional(),
      routeId: objectIdSchema.optional(),
      capacity: z.number().int().min(1).max(40).optional(),
      photoKey: z.string().min(1).nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
  params: z.object({}),
  query: z.object({}),
});

export const createMyJeepneySchema = z.object({
  body: z.object({
    code: z.string().min(1),
    plateNumber: z.string().min(1),
    routeId: objectIdSchema,
    capacity: z.number().int().min(1).max(40),
    photoKey: z.string().min(1).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});
