import { Response } from "express";
import { env } from "../config/env";

export const REFRESH_COOKIE_NAME = "refresh_token";

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: env.cookieDomain || undefined,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: env.cookieDomain || undefined,
    path: "/",
  });
};