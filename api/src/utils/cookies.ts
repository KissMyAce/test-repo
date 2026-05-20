import { Response } from "express";

export const REFRESH_COOKIE_NAME = "refresh_token";

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // or your env value
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
};