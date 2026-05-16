import { z } from "zod";

const scheduleStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id format");

const scheduleDateRangeRefinement = (value: {
  departureAt?: Date;
  arrivalAt?: Date;
}) => {
  if (!value.departureAt || !value.arrivalAt) return true;
  return value.arrivalAt.getTime() > value.departureAt.getTime();
};

export const listSchedulesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    routeId: objectIdSchema.optional(),
    jeepneyId: objectIdSchema.optional(),
    status: scheduleStatusSchema.optional(),
    date: z.string().regex(dateOnlyRegex, "date must be YYYY-MM-DD").optional(),
    departureFrom: z.coerce.date().optional(),
    departureTo: z.coerce.date().optional(),
  }),
});

export const getScheduleByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    scheduleId: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

export const createScheduleSchema = z.object({
  body: z
    .object({
      jeepneyId: objectIdSchema,
      routeId: objectIdSchema,
      departureAt: z.coerce.date(),
      arrivalAt: z.coerce.date(),
      status: scheduleStatusSchema.optional(),
    })
    .refine(scheduleDateRangeRefinement, {
      message: "arrivalAt must be later than departureAt",
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const createMyScheduleSchema = z.object({
  body: z
    .object({
      jeepneyId: objectIdSchema.optional(),
      routeId: objectIdSchema,
      departureAt: z.coerce.date(),
      arrivalAt: z.coerce.date(),
      status: scheduleStatusSchema.optional(),
    })
    .refine(scheduleDateRangeRefinement, {
      message: "arrivalAt must be later than departureAt",
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateScheduleSchema = z.object({
  body: z
    .object({
      jeepneyId: objectIdSchema.optional(),
      routeId: objectIdSchema.optional(),
      departureAt: z.coerce.date().optional(),
      arrivalAt: z.coerce.date().optional(),
      status: scheduleStatusSchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    })
    .refine(scheduleDateRangeRefinement, {
      message: "arrivalAt must be later than departureAt",
    }),
  params: z.object({
    scheduleId: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

export const updateMyScheduleSchema = z.object({
  body: z
    .object({
      routeId: objectIdSchema.optional(),
      departureAt: z.coerce.date().optional(),
      arrivalAt: z.coerce.date().optional(),
      status: scheduleStatusSchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    })
    .refine(scheduleDateRangeRefinement, {
      message: "arrivalAt must be later than departureAt",
    }),
  params: z.object({
    scheduleId: objectIdSchema,
  }),
  query: z.object({}).optional(),
});
