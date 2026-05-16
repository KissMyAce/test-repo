import { Response } from "express";
import { env } from "../config/env";

export const REFRESH_COOKIE_NAME = "refresh_token";

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax",
    domain: env.cookieDomain,
    path: "/",
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax",
    domain: env.cookieDomain,
    path: "/",
  });
};
