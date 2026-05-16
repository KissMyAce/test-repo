import "express-serve-static-core";
import { AuthContextUser } from "./request";

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthContextUser;
  }
}
