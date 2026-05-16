import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const avatarUploadUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    fileSize: z.number().positive().max(5 * 1024 * 1024),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const avatarCommitSchema = z.object({
  body: z.object({
    objectKey: z.string().min(1),
  }),
  params: z.object({}),
  query: z.object({}),
});
