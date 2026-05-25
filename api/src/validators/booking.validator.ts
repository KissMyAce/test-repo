import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id format");
const bookingStatusSchema = z.enum(["pending", "confirmed", "cancelled", "failed_payment"]);

export const createBookingSchema = z.object({
  body: z.object({
    scheduleId: objectIdSchema,
    seats: z.number().int().min(1).max(40),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const listMyBookingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    status: bookingStatusSchema.optional(),
    bookingRef: z.string().trim().min(1).optional(),
    scheduleId: objectIdSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const getMyBookingByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    bookingId: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

export const cancelMyBookingSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1).max(300).optional(),
  }),
  params: z.object({
    bookingId: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

export const listAdminBookingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    status: bookingStatusSchema.optional(),
    bookingRef: z.string().trim().min(1).optional(),
    passengerId: objectIdSchema.optional(),
    scheduleId: objectIdSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const updateAdminBookingSchema = z.object({
  body: z
    .object({
      status: bookingStatusSchema.optional(),
      cancelReason: z.string().trim().min(1).max(300).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
  params: z.object({
    bookingId: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

export const listDriverBookingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    status: bookingStatusSchema.optional(),
    bookingRef: z.string().trim().min(1).optional(),
    scheduleId: objectIdSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const confirmPaymentSchema = z.object({
  body: z.object({
    paymentMethod: z.enum(["gcash", "maya"]),
    paymentReference: z.string().trim().min(1).optional(),
  }),
  params: z.object({
    bookingId: objectIdSchema,
  }),
  query: z.object({}).optional(),
});
