import { Router } from "express";
import {
  changeProfilePassword,
  commitAvatarUpload,
  getAvatarUploadUrl,
  getProfileMe,
  updateProfileMe,
} from "../controllers/profile.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  avatarCommitSchema,
  avatarUploadUrlSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../validators/profile.validator";

export const profileRouter = Router();

profileRouter.get("/me", requireAuth, getProfileMe);
profileRouter.patch("/me", requireAuth, validate(updateProfileSchema), updateProfileMe);
profileRouter.patch("/me/password", requireAuth, validate(changePasswordSchema), changeProfilePassword);
profileRouter.post("/me/avatar/upload-url", requireAuth, validate(avatarUploadUrlSchema), getAvatarUploadUrl);
profileRouter.post("/me/avatar/commit", requireAuth, validate(avatarCommitSchema), commitAvatarUpload);
