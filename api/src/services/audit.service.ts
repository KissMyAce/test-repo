import { Types } from "mongoose";
import { AuditLogModel } from "../models";

export const createAuditLog = async (params: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}) => {
  await AuditLogModel.create({
    actorUserId: params.actorUserId ? new Types.ObjectId(params.actorUserId) : null,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId || null,
    meta: params.meta || {},
  });
};
