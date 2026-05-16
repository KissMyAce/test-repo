export const USER_ROLES = ["passenger", "driver", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "pending_verification", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const DRIVER_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type DriverApprovalStatus = (typeof DRIVER_APPROVAL_STATUSES)[number];
