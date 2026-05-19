// config/env.ts
import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getEnvVar = (name: string, fallback?: string) => {
  const value = process.env[name] || fallback;
  if (!value) {
    console.warn(`⚠️ Environment variable ${name} is missing!`);
  }
  return value || "";
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 4000),
  mongoUri: getEnvVar("MONGODB_URI"),
  corsOrigin: getEnvVar("CORS_ORIGIN", "http://localhost:8080"),

  jwtAccessSecret: getEnvVar("JWT_ACCESS_SECRET", "dev-access-secret"),
  jwtRefreshSecret: getEnvVar("JWT_REFRESH_SECRET", "dev-refresh-secret"),
  jwtResetSecret: getEnvVar("JWT_RESET_SECRET", "dev-reset-secret"),
  jwtUploadSecret:
    getEnvVar("JWT_UPLOAD_SECRET") || getEnvVar("JWT_RESET_SECRET", "dev-upload-secret"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlDays: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 30),

  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  secureCookies: process.env.NODE_ENV === "production",

  r2AccountId: getEnvVar("R2_ACCOUNT_ID"),
  r2AccessKeyId: getEnvVar("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: getEnvVar("R2_SECRET_ACCESS_KEY"),
  r2Bucket: getEnvVar("R2_BUCKET"),
  r2PublicBaseUrl: getEnvVar("R2_PUBLIC_BASE_URL"),
};