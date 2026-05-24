import { apiClient, API_BASE, ApiError } from "@/lib/api-client";
import { AuthUser } from "./types";


export interface AuthSuccessResponse {
  user: AuthUser;
  accessToken?: string;
}

export interface UploadPresignResponse {
  uploadUrl: string;
  objectKey: string;
  headers?: Record<string, string>;
}

export interface UploadCommitResponse {
  objectKey?: string;
}

export interface DriverUploadSessionResponse {
  uploadSessionToken: string;
  expiresInSeconds: number;
}

export interface ProfileData {
  name: string;
  email: string;
  phone?: string | null;
  profileImageKey?: string | null;
  profileImageUrl?: string | null;
}

export interface ProfileMeResponse {
  user: ProfileData;
}

export interface PendingDriverUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status?: string;
  createdAt?: string;
}

export interface PendingDriverProfile {
  userId?: string;
  licenseNumber?: string;
  licenseFileKey?: string;
  nbiFileKey?: string | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  createdAt?: string;
  jeepneyPhotoKey?: string | null;
  jeepneyPhotoUrl?: string | null;
  jeepneyCode?: string;
  jeepneyPlateNumber?: string;
  user?: PendingDriverUser;
}

export interface PendingDriversResponse {
  drivers?: PendingDriverProfile[];
}

export interface AdminDriverProfile {
  licenseNumber?: string;
  licenseFileKey?: string;
  nbiFileKey?: string | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "passenger" | "driver" | "admin";
  status: "active" | "pending_verification" | "suspended";
  createdAt?: string;
  driverProfile?: AdminDriverProfile | null;
}

export interface RouteData {
  id: string;
  name: string;
  origin: string;
  destination: string;
  baseFare: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutesListResponse {
  routes: RouteData[];
}

export interface JeepneyRouteData {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

export interface JeepneyDriverData {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
}

export interface JeepneyData {
  id: string;
  code: string;
  plateNumber: string;
  capacity: number;
  status: "active" | "inactive";
  photoKey?: string | null;
  photoUrl?: string | null;
  route?: JeepneyRouteData | null;
  driver?: JeepneyDriverData | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JeepneysListResponse {
  jeepneys: JeepneyData[];
}

export type ScheduleStatus = "scheduled" | "completed" | "cancelled";

export interface ScheduleRouteData {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

export interface ScheduleJeepneyData {
  id: string;
  code: string;
  plateNumber: string;
  capacity: number;
  status: "active" | "inactive";
}

export interface ScheduleData {
  id: string;
  departureAt: string;
  arrivalAt: string;
  status: ScheduleStatus;
  availableSeats: number;
  confirmedBookingsCount?: number;
  route?: ScheduleRouteData | null;
  jeepney?: ScheduleJeepneyData | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchedulesListResponse {
  schedules: ScheduleData[];
}

export const loginRequest = (payload: { email: string; password: string }) =>
  apiClient.post<AuthSuccessResponse>(`/auth/login`, payload);

export const registerPassengerRequest = (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) => apiClient.post<AuthSuccessResponse>(`/auth/register/passenger`, payload);

export const registerDriverRequest = (payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  licenseNumber: string;
  licenseFileKey: string;
  nbiFileKey?: string;
  profileImageKey?: string;
}) => apiClient.post<AuthSuccessResponse>(`/auth/register/driver`, payload);

export const forgotPasswordRequest = (payload: { email: string }) =>
  apiClient.post(`/auth/forgot-password`, payload);

export const resetPasswordRequest = (payload: { token: string; password: string }) =>
  apiClient.post(`/auth/reset-password`, payload);

export const presignUploadRequest = (payload: {
  fileName: string;
  contentType: string;
  fileSize: number;
  purpose: "avatar" | "driver-license" | "driver-nbi" | "driver-photo";
}) => apiClient.post<UploadPresignResponse>(`/uploads/presign`, payload);

export const commitUploadRequest = (payload: {
  objectKey: string;
  purpose: "avatar" | "driver-license" | "driver-nbi" | "driver-photo";
}) => apiClient.post<UploadCommitResponse>(`/uploads/commit`, payload);

export const createDriverUploadSessionRequest = (payload: { email: string }) =>
  apiClient.post<DriverUploadSessionResponse>(`/uploads/preregister/session`, payload);

export const uploadPreregisterFileRequest = async (payload: {
  uploadSessionToken: string;
  fileName: string;
  contentType: string;
  purpose: "driver-license" | "driver-nbi" | "driver-photo";
  file: File;
}) => {
  const query = new URLSearchParams({
    uploadSessionToken: payload.uploadSessionToken,
    purpose: payload.purpose,
    fileName: payload.fileName,
  });

  const response = await fetch(`${API_BASE}/uploads/preregister/upload?${query.toString()}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": payload.contentType,
    },
    body: payload.file,
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new ApiError(response.status, errorPayload, `Upload failed with status ${response.status}`);
  }

  return (await response.json()) as { objectKey: string };
};

export const preregisterPresignUploadRequest = (payload: {
  uploadSessionToken: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  purpose: "driver-license" | "driver-nbi" | "driver-photo";
}) => apiClient.post<UploadPresignResponse>(`/uploads/preregister/presign`, payload);

export const preregisterCommitUploadRequest = (payload: {
  uploadSessionToken: string;
  objectKey: string;
  purpose: "driver-license" | "driver-nbi" | "driver-photo";
}) => apiClient.post<UploadCommitResponse>(`/uploads/preregister/commit`, payload);

export const getProfileMeRequest = () => apiClient.get<ProfileMeResponse>(`/profile/me`);

export const updateProfileMeRequest = (payload: { name?: string; phone?: string }) =>
  apiClient.patch<ProfileMeResponse>(`/profile/me`, payload);

export const changeProfilePasswordRequest = (payload: {
  currentPassword: string;
  newPassword: string;
}) => apiClient.patch(`/profile/me/password`, payload);

export const getProfileAvatarUploadUrlRequest = (payload: {
  fileName: string;
  contentType: string;
  fileSize: number;
}) => apiClient.post<UploadPresignResponse>(`/profile/me/avatar/upload-url`, payload);

export const commitProfileAvatarUploadRequest = (payload: { objectKey: string }) =>
  apiClient.post<ProfileMeResponse | UploadCommitResponse>(`/profile/me/avatar/commit`, payload);

export const getPendingDriversRequest = () =>
  apiClient.get<PendingDriversResponse | PendingDriverProfile[]>(`/admin/drivers/pending`);

export const getApprovedDriversRequest = () =>
  apiClient.get<PendingDriversResponse | PendingDriverProfile[]>(`/admin/drivers/approved`);

export const getAdminUsersRequest = (query?: { search?: string; role?: "passenger" | "driver" }) => {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (query?.role) params.set("role", query.role);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<{ users: AdminUser[] }>(`/admin/users${suffix}`);
};

export const createAdminUserRequest = (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "passenger" | "driver";
  licenseNumber?: string;
  licenseFileKey?: string;
  nbiFileKey?: string;
}) => apiClient.post<{ user: AdminUser }>(`/admin/users`, payload);

export const updateAdminUserRequest = (
  userId: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    status?: "active" | "pending_verification" | "suspended";
    driverProfile?: {
      licenseNumber?: string;
      licenseFileKey?: string;
      nbiFileKey?: string;
    };
  }
) => apiClient.patch<{ message: string; user: AdminUser }>(`/admin/users/${userId}`, payload);

export const deleteAdminUserRequest = (userId: string) =>
  apiClient.delete<{ message: string }>(`/admin/users/${userId}`);

export const getDriverDocumentUrlRequest = (objectKey: string) =>
  apiClient.get<{ url: string }>(`/admin/driver-doc-url?objectKey=${encodeURIComponent(objectKey)}`);

export const approveDriverRequest = (userId: string, payload?: { reviewNotes?: string }) =>
  apiClient.patch(`/admin/drivers/${userId}/approve`, payload || {});

export const rejectDriverRequest = (userId: string, payload: { reason: string }) =>
  apiClient.patch(`/admin/drivers/${userId}/reject`, payload);

export const approveJeepneyRequest = (jeepneyId: string, payload?: { reviewNotes?: string }) =>
  apiClient.patch(`/admin/jeepneys/${jeepneyId}/approve`, payload || {});

export const rejectJeepneyRequest = (jeepneyId: string, payload: { reason: string }) =>
  apiClient.patch(`/admin/jeepneys/${jeepneyId}/reject`, payload);

export const getRoutesRequest = (query?: { search?: string; isActive?: boolean }) => {
  const params = new URLSearchParams();
  if (query?.search?.trim()) {
    params.set("search", query.search.trim());
  }
  if (typeof query?.isActive === "boolean") {
    params.set("isActive", String(query.isActive));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<RoutesListResponse>(`/routes${suffix}`);
};

export const createRouteRequest = (payload: {
  name: string;
  origin: string;
  destination: string;
  baseFare: number;
  isActive?: boolean;
}) => apiClient.post<{ route: RouteData }>(`/admin/routes`, payload);

export const updateRouteRequest = (
  routeId: string,
  payload: {
    name?: string;
    origin?: string;
    destination?: string;
    baseFare?: number;
    isActive?: boolean;
  }
) => apiClient.patch<{ route: RouteData }>(`/admin/routes/${routeId}`, payload);

export const deleteRouteRequest = (routeId: string) =>
  apiClient.delete<{ message: string }>(`/admin/routes/${routeId}`);

export const getJeepneysRequest = (query?: {
  search?: string;
  routeId?: string;
  driverId?: string;
  status?: "active" | "inactive";
}) => {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (query?.routeId) params.set("routeId", query.routeId);
  if (query?.driverId) params.set("driverId", query.driverId);
  if (query?.status) params.set("status", query.status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<JeepneysListResponse>(`/jeepneys${suffix}`);
};

export const getAdminJeepneysRequest = (query?: {
  search?: string;
  routeId?: string;
  driverId?: string;
  status?: "active" | "inactive";
}) => {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (query?.routeId) params.set("routeId", query.routeId);
  if (query?.driverId) params.set("driverId", query.driverId);
  if (query?.status) params.set("status", query.status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<JeepneysListResponse>(`/admin/jeepneys${suffix}`);
};

export const getJeepneyByIdRequest = (jeepneyId: string) =>
  apiClient.get<{ jeepney: JeepneyData }>(`/jeepneys/${jeepneyId}`);

export const createJeepneyRequest = (payload: {
  code: string;
  plateNumber: string;
  routeId: string;
  driverId: string;
  capacity: number;
  status?: "active" | "inactive";
  photoKey?: string;
}) => apiClient.post<{ jeepney: JeepneyData }>(`/admin/jeepneys`, payload);

export const updateJeepneyRequest = (
  jeepneyId: string,
  payload: {
    code?: string;
    plateNumber?: string;
    routeId?: string;
    driverId?: string;
    capacity?: number;
    status?: "active" | "inactive";
    photoKey?: string | null;
  }
) => apiClient.patch<{ jeepney: JeepneyData }>(`/admin/jeepneys/${jeepneyId}`, payload);

export const deleteJeepneyRequest = (jeepneyId: string) =>
  apiClient.delete<{ message: string }>(`/admin/jeepneys/${jeepneyId}`);

export const getMyJeepneyRequest = () =>
  apiClient.get<{ jeepney: JeepneyData }>("/driver/jeepney/me");

export const updateMyJeepneyRequest = (payload: {
  code?: string;
  plateNumber?: string;
  routeId?: string;
  capacity?: number;
  photoKey?: string | null;
}) => apiClient.patch<{ jeepney: JeepneyData }>("/driver/jeepney/me", payload);

export const applyMyJeepneyRequest = (payload: {
  code: string;
  plateNumber: string;
  routeId: string;
  capacity: number;
  photoKey?: string;
}) => apiClient.post<{ jeepney: JeepneyData }>("/driver/jeepney/apply", payload);

export const getSchedulesRequest = (query?: {
  routeId?: string;
  jeepneyId?: string;
  status?: ScheduleStatus;
  date?: string;
  departureFrom?: string;
  departureTo?: string;
}) => {
  const params = new URLSearchParams();
  if (query?.routeId) params.set("routeId", query.routeId);
  if (query?.jeepneyId) params.set("jeepneyId", query.jeepneyId);
  if (query?.status) params.set("status", query.status);
  if (query?.date) params.set("date", query.date);
  if (query?.departureFrom) params.set("departureFrom", query.departureFrom);
  if (query?.departureTo) params.set("departureTo", query.departureTo);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<SchedulesListResponse>(`/schedules${suffix}`);
};

export const getScheduleByIdRequest = (scheduleId: string) =>
  apiClient.get<{ schedule: ScheduleData }>(`/schedules/${scheduleId}`);

export const getAdminSchedulesRequest = (query?: {
  routeId?: string;
  jeepneyId?: string;
  status?: ScheduleStatus;
  date?: string;
  departureFrom?: string;
  departureTo?: string;
}) => {
  const params = new URLSearchParams();
  if (query?.routeId) params.set("routeId", query.routeId);
  if (query?.jeepneyId) params.set("jeepneyId", query.jeepneyId);
  if (query?.status) params.set("status", query.status);
  if (query?.date) params.set("date", query.date);
  if (query?.departureFrom) params.set("departureFrom", query.departureFrom);
  if (query?.departureTo) params.set("departureTo", query.departureTo);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<SchedulesListResponse>(`/admin/schedules${suffix}`);
};

export const createAdminScheduleRequest = (payload: {
  jeepneyId: string;
  routeId: string;
  departureAt: string;
  arrivalAt: string;
  status?: ScheduleStatus;
}) => apiClient.post<{ schedule: ScheduleData }>(`/admin/schedules`, payload);

export const updateAdminScheduleRequest = (
  scheduleId: string,
  payload: {
    jeepneyId?: string;
    routeId?: string;
    departureAt?: string;
    arrivalAt?: string;
    status?: ScheduleStatus;
  }
) => apiClient.patch<{ schedule: ScheduleData }>(`/admin/schedules/${scheduleId}`, payload);

export const deleteAdminScheduleRequest = (scheduleId: string) =>
  apiClient.delete<{ message: string }>(`/admin/schedules/${scheduleId}`);

export const getMySchedulesRequest = (query?: {
  routeId?: string;
  status?: ScheduleStatus;
  date?: string;
  departureFrom?: string;
  departureTo?: string;
}) => {
  const params = new URLSearchParams();
  if (query?.routeId) params.set("routeId", query.routeId);
  if (query?.status) params.set("status", query.status);
  if (query?.date) params.set("date", query.date);
  if (query?.departureFrom) params.set("departureFrom", query.departureFrom);
  if (query?.departureTo) params.set("departureTo", query.departureTo);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<SchedulesListResponse>(`/driver/schedules/me${suffix}`);
};

export const createMyScheduleRequest = (payload: {
  routeId: string;
  departureAt: string;
  arrivalAt: string;
  status?: ScheduleStatus;
}) => apiClient.post<{ schedule: ScheduleData }>(`/driver/schedules/me`, payload);

export const updateMyScheduleRequest = (
  scheduleId: string,
  payload: {
    routeId?: string;
    departureAt?: string;
    arrivalAt?: string;
    status?: ScheduleStatus;
  }
) => apiClient.patch<{ schedule: ScheduleData }>(`/driver/schedules/me/${scheduleId}`, payload);

export const deleteMyScheduleRequest = (scheduleId: string) =>
  apiClient.delete<{ message: string }>(`/driver/schedules/me/${scheduleId}`);
