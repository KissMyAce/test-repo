import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id format");

export const listRoutesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    search: z.string().trim().min(1).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  }),
});

export const getRouteByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    routeId: objectIdSchema,
  }),
  query: z.object({}),
});

export const createRouteSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    origin: z.string().min(1),
    destination: z.string().min(1),
    baseFare: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateRouteSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).optional(),
      origin: z.string().min(1).optional(),
      destination: z.string().min(1).optional(),
      baseFare: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
  params: z.object({
    routeId: objectIdSchema,
  }),
  query: z.object({}),
});
