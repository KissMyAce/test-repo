import { env } from "../config/env";

export const getPublicObjectUrl = (key: string | null | undefined) => {
  if (!key || !env.r2PublicBaseUrl) return null;
  return `${env.r2PublicBaseUrl.replace(/\/$/, "")}/${key}`;
};
