import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Users,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  createMyScheduleRequest,
  deleteMyScheduleRequest,
  getMyJeepneyRequest,
  getMySchedulesRequest,
  getRoutesRequest,
  JeepneyData,
  RouteData,
  ScheduleData,
  ScheduleStatus,
  updateMyScheduleRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

const statusColors: Record<ScheduleStatus, string> = {
  scheduled: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

type ScheduleForm = {
  routeId: string;
  date: string;
  departure: string;
  arrival: string;
  status: ScheduleStatus;
};

const emptyForm: ScheduleForm = {
  routeId: "",
  date: "",
  departure: "",
  arrival: "",
  status: "scheduled",
};

const combineDateTimeToIso = (dateText: string, timeText: string) =>
  new Date(`${dateText}T${timeText}:00`).toISOString();

const DriverSchedules = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [routeList, setRouteList] = useState<RouteData[]>([]);
  const [myJeepney, setMyJeepney] = useState<JeepneyData | null>(null);
  const [scheduleList, setScheduleList] = useState<ScheduleData[]>([]);

  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ScheduleStatus>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleData | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const loadRoutesAndJeepney = async () => {
      try {
        const [routePayload, jeepneyPayload] = await Promise.all([
          getRoutesRequest({ isActive: true }),
          getMyJeepneyRequest(),
        ]);
        if (!mounted) return;
        setRouteList(routePayload.routes || []);
        setMyJeepney(jeepneyPayload.jeepney || null);
      } catch {
        if (!mounted) return;
        setRouteList([]);
        setMyJeepney(null);
      }
    };

    void loadRoutesAndJeepney();

    return () => {
      mounted = false;
    };
  }, []);

  const loadSchedules = async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const payload = await getMySchedulesRequest({
        routeId: routeFilter === "all" ? undefined : routeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        date: dateFilter ? format(dateFilter, "yyyy-MM-dd") : undefined,
      });

      setLoadError(null);
      setScheduleList(payload.schedules || []);
    } catch (error) {
      let description = "Unable to load schedules.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Load failed", description, variant: "destructive" });
      setLoadError(description);
      setScheduleList([]);
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSchedules(true);
  }, [routeFilter, statusFilter, dateFilter, reloadKey]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.routeId) nextErrors.routeId = "Required";
    if (!form.date) nextErrors.date = "Required";
    if (!form.departure) nextErrors.departure = "Required";
    if (!form.arrival) nextErrors.arrival = "Required";

    if (form.date && new Date(form.date) < new Date(new Date().toDateString())) {
      nextErrors.date = "Must be today or later";
    }

    if (form.date && form.departure && form.arrival) {
      const departureIso = combineDateTimeToIso(form.date, form.departure);
      const arrivalIso = combineDateTimeToIso(form.date, form.arrival);
      if (new Date(arrivalIso).getTime() <= new Date(departureIso).getTime()) {
        nextErrors.arrival = "Must be after departure";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await createMyScheduleRequest({
        routeId: form.routeId,
        departureAt: combineDateTimeToIso(form.date, form.departure),
        arrivalAt: combineDateTimeToIso(form.date, form.arrival),
        status: form.status,
      });

      setAddOpen(false);
      setForm(emptyForm);
      setErrors({});
      toast({ title: "Schedule Added", description: "New schedule created successfully." });
      await loadSchedules();
    } catch (error) {
      let description = "Unable to create schedule.";
      if (error instanceof ApiError && error.status === 400) {
        description = "Invalid schedule data. Please check form values.";
      } else if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Create failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!validate() || !selectedSchedule) return;

    setSaving(true);
    try {
      await updateMyScheduleRequest(selectedSchedule.id, {
        routeId: form.routeId,
        departureAt: combineDateTimeToIso(form.date, form.departure),
        arrivalAt: combineDateTimeToIso(form.date, form.arrival),
        status: form.status,
      });

      setEditOpen(false);
      setSelectedSchedule(null);
      setForm(emptyForm);
      setErrors({});
      toast({ title: "Schedule Updated", description: "Changes saved." });
      await loadSchedules();
    } catch (error) {
      let description = "Unable to update schedule.";
      if (error instanceof ApiError && error.status === 404) {
        description = "Schedule no longer exists.";
      } else if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Update failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;

    setSaving(true);
    try {
      await deleteMyScheduleRequest(selectedSchedule.id);
      setDeleteOpen(false);
      setSelectedSchedule(null);
      toast({ title: "Schedule Deleted", description: "Schedule removed." });
      await loadSchedules();
    } catch (error) {
      let description = "Unable to delete schedule.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Delete failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (schedule: ScheduleData) => {
    if (schedule.status === "completed" || schedule.status === "cancelled") return;

    const departure = parseISO(schedule.departureAt);
    const arrival = parseISO(schedule.arrivalAt);

    setSelectedSchedule(schedule);
    setForm({
      routeId: schedule.route?.id || "",
      date: format(departure, "yyyy-MM-dd"),
      departure: format(departure, "HH:mm"),
      arrival: format(arrival, "HH:mm"),
      status: schedule.status,
    });
    setErrors({});
    setEditOpen(true);
  };

  const openDelete = (schedule: ScheduleData) => {
    setSelectedSchedule(schedule);
    setDeleteOpen(true);
  };

  const selectedRouteOptions = useMemo(() => {
    if (!myJeepney?.route?.id) {
      return routeList;
    }
    return routeList.filter((route) => route.id === myJeepney.route?.id);
  }, [myJeepney, routeList]);

  useEffect(() => {
    if (myJeepney?.route?.id && !form.routeId) {
      setForm((prev) => ({ ...prev, routeId: myJeepney.route!.id }));
    }
  }, [myJeepney, form.routeId]);

  const filteredSchedules = useMemo(() => scheduleList, [scheduleList]);

  const ScheduleFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Route</Label>
        <Select value={form.routeId} onValueChange={(value) => setForm((prev) => ({ ...prev, routeId: value }))}>
          <SelectTrigger className={errors.routeId ? "border-destructive" : ""}>
            <SelectValue placeholder="Select route" />
          </SelectTrigger>
          <SelectContent>
            {selectedRouteOptions.map((route) => (
              <SelectItem key={route.id} value={route.id}>
                {route.origin} → {route.destination}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {myJeepney?.route?.id && selectedRouteOptions.length === 1 ? (
          <p className="text-[11px] text-muted-foreground">Only your assigned jeepney route appears here.</p>
        ) : null}
        {errors.routeId && <p className="text-[11px] text-destructive">{errors.routeId}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Departure Date</Label>
        <Input
          type="date"
          value={form.date}
          min={format(new Date(), "yyyy-MM-dd")}
          onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          className={errors.date ? "border-destructive" : ""}
        />
        {errors.date && <p className="text-[11px] text-destructive">{errors.date}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Departure Time</Label>
          <Input
            type="time"
            value={form.departure}
            onChange={(event) => setForm((prev) => ({ ...prev, departure: event.target.value }))}
            className={errors.departure ? "border-destructive" : ""}
          />
          {errors.departure && <p className="text-[11px] text-destructive">{errors.departure}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Arrival Time</Label>
          <Input
            type="time"
            value={form.arrival}
            onChange={(event) => setForm((prev) => ({ ...prev, arrival: event.target.value }))}
            className={errors.arrival ? "border-destructive" : ""}
          />
          {errors.arrival && <p className="text-[11px] text-destructive">{errors.arrival}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Status</Label>
        <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as ScheduleStatus }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-10 w-48 rounded-xl" />
        {[1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Schedules</h1>
        <Button
          size="sm"
          onClick={() => {
            setForm(emptyForm);
            setErrors({});
            setAddOpen(true);
          }}
          className="hidden sm:flex"
        >
          <Plus className="w-4 h-4" /> Add Schedule
        </Button>
      </div>

      <Button
        className="w-full sm:hidden"
        onClick={() => {
          setForm(emptyForm);
          setErrors({});
          setAddOpen(true);
        }}
      >
        <Plus className="w-4 h-4" /> Add Schedule
      </Button>

      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("justify-start text-left font-normal", !dateFilter && "text-muted-foreground")}
            >
              <CalendarIcon className="w-4 h-4" />
              {dateFilter ? format(dateFilter, "PPP") : "All dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Select value={routeFilter} onValueChange={setRouteFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All routes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All routes</SelectItem>
            {routeList.map((route) => (
              <SelectItem key={route.id} value={route.id}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | ScheduleStatus)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {refreshing && (
          <div className="inline-flex items-center text-xs text-muted-foreground px-2">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Refreshing
          </div>
        )}
      </div>

      {loadError ? (
        <div className="text-center py-16 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Unable to load schedules</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </Button>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="icon-badge-lg mx-auto bg-muted text-muted-foreground">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No schedules yet</h2>
          <p className="text-sm text-muted-foreground">Add your first schedule to get started.</p>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setErrors({});
              setAddOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add Your First Schedule
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filteredSchedules.map((schedule) => {
              const departure = parseISO(schedule.departureAt);
              const arrival = parseISO(schedule.arrivalAt);
              const totalSeats = schedule.jeepney?.capacity || 0;
              const availableSeats = schedule.availableSeats ?? totalSeats;

              return (
                <Card key={schedule.id} className="card-shadow border-0">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {schedule.route?.origin || "-"} → {schedule.route?.destination || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(departure, "yyyy-MM-dd")}</p>
                      </div>
                      <Badge className={cn("text-[10px] shrink-0", statusColors[schedule.status])}>{schedule.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(departure, "hh:mm a")} — {format(arrival, "hh:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {totalSeats - availableSeats}/{totalSeats}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={schedule.status === "completed" || schedule.status === "cancelled"}
                        onClick={() => openEdit(schedule)}
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDelete(schedule)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="card-shadow border-0 hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => {
                  const departure = parseISO(schedule.departureAt);
                  const arrival = parseISO(schedule.arrivalAt);
                  const totalSeats = schedule.jeepney?.capacity || 0;
                  const availableSeats = schedule.availableSeats ?? totalSeats;

                  return (
                    <TableRow key={schedule.id}>
                      <TableCell className="text-sm">{format(departure, "yyyy-MM-dd")}</TableCell>
                      <TableCell className="text-sm">{format(departure, "hh:mm a")}</TableCell>
                      <TableCell className="text-sm">{format(arrival, "hh:mm a")}</TableCell>
                      <TableCell className="text-sm">
                        {schedule.route?.origin || "-"} → {schedule.route?.destination || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {totalSeats - availableSeats}/{totalSeats}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]", statusColors[schedule.status])}>{schedule.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={schedule.status === "completed" || schedule.status === "cancelled"}
                            onClick={() => openEdit(schedule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDelete(schedule)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogDescription>Create a new departure schedule.</DialogDescription>
          </DialogHeader>
          <ScheduleFormFields />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleAdd()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Update schedule details.</DialogDescription>
          </DialogHeader>
          <ScheduleFormFields />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleEdit()} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Schedule
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
              {selectedSchedule && (selectedSchedule.confirmedBookingsCount || 0) > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  {selectedSchedule.confirmedBookingsCount} passenger booking(s) exist for this schedule.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverSchedules;
