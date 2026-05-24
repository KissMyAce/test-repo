import { z } from "zod";

const userRoleSchema = z.enum(["passenger", "driver"]);
const userStatusSchema = z.enum(["active", "pending_verification", "suspended"]);

export const approveDriverSchema = z.object({
  body: z.object({
    reviewNotes: z.string().optional(),
  }),
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({}),
});

export const rejectDriverSchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  }),
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({}),
});

export const approveJeepneySchema = z.object({
  body: z.object({
    reviewNotes: z.string().optional(),
  }),
  params: z.object({
    jeepneyId: z.string().min(1),
  }),
  query: z.object({}),
});

export const rejectJeepneySchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  }),
  params: z.object({
    jeepneyId: z.string().min(1),
  }),
  query: z.object({}),
});

export const listAdminUsersSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    search: z.string().optional(),
    role: userRoleSchema.optional(),
  }),
});

export const createAdminUserSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(6),
    role: userRoleSchema,
    licenseNumber: z.string().optional(),
    licenseFileKey: z.string().optional(),
    nbiFileKey: z.string().optional(),
  }).superRefine((body, ctx) => {
    if (body.role === "driver" && !body.licenseFileKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Driver accounts require a license file key.",
        path: ["licenseFileKey"],
      });
    }
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateAdminUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string().min(6).optional(),
    status: userStatusSchema.optional(),
    driverProfile: z
      .object({
        licenseNumber: z.string().optional(),
        licenseFileKey: z.string().optional(),
        nbiFileKey: z.string().optional(),
      })
      .optional(),
  }),
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({}),
});

export const deleteAdminUserSchema = z.object({
  body: z.object({}),
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({}),
});

export const getDriverDocumentUrlSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    objectKey: z.string().min(1),
  }),
});
