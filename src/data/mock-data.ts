// Shared mock data for Jee-PS

export interface Route {
  id: string;
  name: string;
  from: string;
  to: string;
}

export interface Jeepney {
  id: string;
  name: string;
  plate: string;
  driver: string;
  route: Route;
  capacity: number;
  availableSeats: number;
  status: "active" | "inactive";
  photo?: string;
}

export interface Schedule {
  id: string;
  route: Route;
  jeepney: Jeepney;
  departure: string;
  arrival: string;
  availableSeats: number;
  totalSeats: number;
  status: "on-time" | "delayed" | "cancelled";
  date: string;
}

export interface Booking {
  id: string;
  reference: string;
  schedule: Schedule;
  seats: number;
  total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentMethod?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "booking" | "payment" | "schedule" | "system";
  read: boolean;
  createdAt: string;
}

export const routes: Route[] = [
  { id: "r1", name: "Route 12", from: "SM City", to: "Ayala Terminal" },
  { id: "r2", name: "Route 07", from: "Carbon Market", to: "Talamban" },
  { id: "r3", name: "Route 04", from: "Colon St", to: "IT Park" },
  { id: "r4", name: "Route 22", from: "Mandaue City", to: "SRP" },
  { id: "r5", name: "Route 15", from: "Lahug", to: "Talisay" },
];

export const jeepneys: Jeepney[] = [
  { id: "j1", name: "Blue Wave", plate: "ABC-1234", driver: "Juan Dela Cruz", route: routes[0], capacity: 20, availableSeats: 8, status: "active" },
  { id: "j2", name: "Red Star", plate: "DEF-5678", driver: "Maria Santos", route: routes[1], capacity: 18, availableSeats: 0, status: "active" },
  { id: "j3", name: "Green Arrow", plate: "GHI-9012", driver: "Pedro Reyes", route: routes[2], capacity: 22, availableSeats: 15, status: "active" },
  { id: "j4", name: "Yellow Sun", plate: "JKL-3456", driver: "Ana Lim", route: routes[3], capacity: 20, availableSeats: 5, status: "inactive" },
  { id: "j5", name: "Silver Line", plate: "MNO-7890", driver: "Jose Garcia", route: routes[4], capacity: 24, availableSeats: 12, status: "active" },
  { id: "j6", name: "White Eagle", plate: "PQR-1122", driver: "Rosa Tan", route: routes[0], capacity: 20, availableSeats: 3, status: "active" },
];

export const schedules: Schedule[] = [
  { id: "s1", route: routes[0], jeepney: jeepneys[0], departure: "06:00 AM", arrival: "06:45 AM", availableSeats: 8, totalSeats: 20, status: "on-time", date: "2026-02-19" },
  { id: "s2", route: routes[0], jeepney: jeepneys[5], departure: "07:30 AM", arrival: "08:15 AM", availableSeats: 3, totalSeats: 20, status: "delayed", date: "2026-02-19" },
  { id: "s3", route: routes[1], jeepney: jeepneys[1], departure: "08:00 AM", arrival: "09:00 AM", availableSeats: 0, totalSeats: 18, status: "on-time", date: "2026-02-19" },
  { id: "s4", route: routes[2], jeepney: jeepneys[2], departure: "09:00 AM", arrival: "09:40 AM", availableSeats: 15, totalSeats: 22, status: "on-time", date: "2026-02-20" },
  { id: "s5", route: routes[3], jeepney: jeepneys[3], departure: "10:00 AM", arrival: "10:50 AM", availableSeats: 5, totalSeats: 20, status: "cancelled", date: "2026-02-20" },
  { id: "s6", route: routes[4], jeepney: jeepneys[4], departure: "11:00 AM", arrival: "11:45 AM", availableSeats: 12, totalSeats: 24, status: "on-time", date: "2026-02-21" },
  { id: "s7", route: routes[0], jeepney: jeepneys[0], departure: "02:00 PM", arrival: "02:45 PM", availableSeats: 10, totalSeats: 20, status: "on-time", date: "2026-02-21" },
  { id: "s8", route: routes[2], jeepney: jeepneys[2], departure: "03:30 PM", arrival: "04:10 PM", availableSeats: 7, totalSeats: 22, status: "on-time", date: "2026-02-22" },
];

export const bookings: Booking[] = [
  { id: "b1", reference: "JPS-20260219-001", schedule: schedules[0], seats: 2, total: 90, status: "confirmed", paymentMethod: "GCash", createdAt: "2026-02-18T10:30:00" },
  { id: "b2", reference: "JPS-20260220-002", schedule: schedules[3], seats: 1, total: 45, status: "pending", createdAt: "2026-02-19T14:00:00" },
  { id: "b3", reference: "JPS-20260221-003", schedule: schedules[6], seats: 3, total: 135, status: "completed", paymentMethod: "Maya", createdAt: "2026-02-17T08:15:00" },
  { id: "b4", reference: "JPS-20260219-004", schedule: schedules[1], seats: 1, total: 45, status: "cancelled", paymentMethod: "GCash", createdAt: "2026-02-16T09:45:00" },
];

export const notifications: Notification[] = [
  { id: "n1", title: "Booking Confirmed", message: "Your booking JPS-20260219-001 has been confirmed.", type: "booking", read: false, createdAt: "2026-02-19T10:35:00" },
  { id: "n2", title: "Payment Received", message: "₱90.00 payment via GCash was successful.", type: "payment", read: false, createdAt: "2026-02-19T10:32:00" },
  { id: "n3", title: "Schedule Delayed", message: "Route 12 — 07:30 AM departure is delayed by 15 minutes.", type: "schedule", read: true, createdAt: "2026-02-19T07:00:00" },
  { id: "n4", title: "Ride Completed", message: "Your trip on Route 12 has been completed. Rate your experience!", type: "system", read: true, createdAt: "2026-02-18T07:00:00" },
  { id: "n5", title: "Booking Cancelled", message: "Booking JPS-20260219-004 has been cancelled and refunded.", type: "booking", read: true, createdAt: "2026-02-17T10:00:00" },
  { id: "n6", title: "Welcome to Jee-PS!", message: "Start by browsing schedules and booking your first ride.", type: "system", read: true, createdAt: "2026-02-15T08:00:00" },
];
