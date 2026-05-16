import { z } from "zod";

export const createDriverUploadSessionSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const presignUploadSchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    fileSize: z.number().positive().max(10 * 1024 * 1024),
    purpose: z.enum(["avatar", "driver-license", "driver-nbi", "driver-photo"]),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const preregisterPresignUploadSchema = z.object({
  body: z.object({
    uploadSessionToken: z.string().min(1),
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    fileSize: z.number().positive().max(10 * 1024 * 1024),
    purpose: z.enum(["driver-license", "driver-nbi", "driver-photo"]),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const preregisterCommitUploadSchema = z.object({
  body: z.object({
    uploadSessionToken: z.string().min(1),
    objectKey: z.string().min(1),
    purpose: z.enum(["driver-license", "driver-nbi", "driver-photo"]),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const commitUploadSchema = z.object({
  body: z.object({
    objectKey: z.string().min(1),
    purpose: z.enum(["avatar", "driver-license", "driver-nbi", "driver-photo"]),
  }),
  params: z.object({}),
  query: z.object({}),
});
