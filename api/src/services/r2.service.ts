import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

type UploadPurpose = "avatar" | "driver-license" | "driver-nbi" | "driver-photo";

const ensureR2Config = () => {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Bucket) {
    throw new AppError(500, "R2_CONFIG_MISSING", "R2 is not fully configured");
  }
};

const getR2Client = () => {
  ensureR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
};

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const purposePrefix = (purpose: UploadPurpose) => {
  if (purpose === "avatar") return "avatars";
  return "driver-docs";
};

export const buildScopedObjectKey = (
  userId: string,
  purpose: UploadPurpose,
  originalFileName: string
) => {
  const safe = sanitizeFileName(originalFileName);
  const prefix = purposePrefix(purpose);
  return `${prefix}/${userId}/${crypto.randomUUID()}-${safe}`;
};

export const createPresignedUploadUrl = async (params: {
  objectKey: string;
  contentType: string;
}) => {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: env.r2Bucket,
    Key: params.objectKey,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });

  return {
    uploadUrl,
    objectKey: params.objectKey,
  };
};

export const uploadObjectToR2 = async (params: {
  objectKey: string;
  contentType: string;
  body: Buffer | Uint8Array | Blob | string;
}) => {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: env.r2Bucket,
    Key: params.objectKey,
    Body: params.body,
    ContentType: params.contentType,
  });

  await client.send(command);
};
