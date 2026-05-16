import crypto from "crypto";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole, UserStatus } from "../types/auth";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  name: string;
  type: "access";
}

interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: "refresh";
}

interface ResetTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  type: "reset";
}

export interface DriverUploadSessionPayload extends JwtPayload {
  sid: string;
  email: string;
  type: "driver-upload";
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, "type">) =>
  jwt.sign({ ...payload, type: "access" }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl as SignOptions["expiresIn"],
  });

export const signRefreshToken = (userId: string) =>
  jwt.sign({ sub: userId, type: "refresh", jti: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d`,
  });

export const signResetToken = (payload: { sub: string; email: string }) =>
  jwt.sign({ ...payload, type: "reset" }, env.jwtResetSecret, {
    expiresIn: "30m",
  });

export const signDriverUploadSessionToken = (payload: { sid: string; email: string }) =>
  jwt.sign({ ...payload, type: "driver-upload" }, env.jwtUploadSecret, {
    expiresIn: "45m",
  });

export const verifyAccessToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
};

export const verifyRefreshToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
};

export const verifyResetToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtResetSecret) as ResetTokenPayload;
  if (decoded.type !== "reset") {
    throw new Error("Invalid token type");
  }
  return decoded;
};

export const verifyDriverUploadSessionToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtUploadSecret) as DriverUploadSessionPayload;
  if (decoded.type !== "driver-upload") {
    throw new Error("Invalid token type");
  }
  return decoded;
};

export const hashToken = (rawToken: string) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");
