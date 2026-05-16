import crypto from "crypto";
import { Request, Response } from "express";
import { buildScopedObjectKey, createPresignedUploadUrl } from "../services/r2.service";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import {
  signDriverUploadSessionToken,
  verifyDriverUploadSessionToken,
} from "../utils/token";

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const buildPreregisterObjectKey = (
  sid: string,
  purpose: "driver-license" | "driver-nbi" | "driver-photo",
  originalFileName: string
) => `prereg-driver/${sid}/${purpose}/${crypto.randomUUID()}-${sanitizeFileName(originalFileName)}`;

export const createDriverUploadSession = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const sid = crypto.randomUUID();
  const uploadSessionToken = signDriverUploadSessionToken({
    sid,
    email: email.toLowerCase().trim(),
  });

  res.status(200).json({
    uploadSessionToken,
    expiresInSeconds: 45 * 60,
  });
});

export const presignUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { fileName, contentType, purpose } = req.body as {
    fileName: string;
    contentType: string;
    purpose: "avatar" | "driver-license" | "driver-nbi" | "driver-photo";
  };

  const objectKey = buildScopedObjectKey(req.authUser.id, purpose, fileName);
  const signed = await createPresignedUploadUrl({ objectKey, contentType });

  res.status(200).json(signed);
});

export const presignPreRegisterUpload = asyncHandler(async (req: Request, res: Response) => {
  const { uploadSessionToken, fileName, contentType, purpose } = req.body as {
    uploadSessionToken: string;
    fileName: string;
    contentType: string;
    purpose: "driver-license" | "driver-nbi" | "driver-photo";
  };

  let session;
  try {
    session = verifyDriverUploadSessionToken(uploadSessionToken);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid upload session token");
  }

  const objectKey = buildPreregisterObjectKey(session.sid, purpose, fileName);
  const signed = await createPresignedUploadUrl({ objectKey, contentType });

  res.status(200).json(signed);
});

export const commitUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { objectKey, purpose } = req.body as {
    objectKey: string;
    purpose: "avatar" | "driver-license" | "driver-nbi" | "driver-photo";
  };

  const expectedPrefix = purpose === "avatar" ? `avatars/${req.authUser.id}/` : `driver-docs/${req.authUser.id}/`;

  if (!objectKey.startsWith(expectedPrefix)) {
    throw new AppError(403, "FORBIDDEN", "Invalid object key scope");
  }

  res.status(200).json({ objectKey });
});

export const commitPreRegisterUpload = asyncHandler(async (req: Request, res: Response) => {
  const { uploadSessionToken, objectKey, purpose } = req.body as {
    uploadSessionToken: string;
    objectKey: string;
    purpose: "driver-license" | "driver-nbi" | "driver-photo";
  };

  let session;
  try {
    session = verifyDriverUploadSessionToken(uploadSessionToken);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid upload session token");
  }

  const expectedPrefix = `prereg-driver/${session.sid}/${purpose}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
    throw new AppError(403, "FORBIDDEN", "Invalid object key scope");
  }

  res.status(200).json({ objectKey });
});
