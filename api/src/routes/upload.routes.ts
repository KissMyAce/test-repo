import express from "express";
import { Router } from "express";
import {
  commitPreRegisterUpload,
  commitUpload,
  createDriverUploadSession,
  presignPreRegisterUpload,
  presignUpload,
  uploadPreregisterFile,
} from "../controllers/upload.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  commitUploadSchema,
  createDriverUploadSessionSchema,
  preregisterCommitUploadSchema,
  preregisterPresignUploadSchema,
  presignUploadSchema,
} from "../validators/upload.validator";

export const uploadRouter = Router();

uploadRouter.post(
  "/preregister/session",
  validate(createDriverUploadSessionSchema),
  createDriverUploadSession
);
uploadRouter.post(
  "/preregister/presign",
  validate(preregisterPresignUploadSchema),
  presignPreRegisterUpload
);
uploadRouter.put(
  "/preregister/upload",
  express.raw({
    type: ["image/*", "application/pdf", "application/octet-stream"],
    limit: "5mb",
  }),
  uploadPreregisterFile
);
uploadRouter.post(
  "/preregister/commit",
  validate(preregisterCommitUploadSchema),
  commitPreRegisterUpload
);

uploadRouter.post("/presign", requireAuth, validate(presignUploadSchema), presignUpload);
uploadRouter.post("/commit", requireAuth, validate(commitUploadSchema), commitUpload);
