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
  createAdminScheduleRequest,
  deleteAdminScheduleRequest,
  getAdminJeepneysRequest,
  getAdminSchedulesRequest,
  getRoutesRequest,
  JeepneyData,
  RouteData,
  ScheduleData,
  ScheduleStatus,
  updateAdminScheduleRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

const statusColors: Record<ScheduleStatus | "expired", string> = {
  scheduled: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
  expired: "bg-amber-600 text-white",
};

type ScheduleForm = {
  routeId: string;
  jeepneyId: string;
  date: string;
  departure: string;
  arrival: string;
  status: ScheduleStatus;
};

const emptyForm: ScheduleForm = {
  routeId: "",
  jeepneyId: "",
  date: "",
  departure: "",
  arrival: "",
  status: "scheduled",
};

const combineDateTimeToIso = (dateText: string, timeText: string) =>
  new Date(`${dateText}T${timeText}:00`).toISOString();

const toDateInput = (iso: string) => format(parseISO(iso), "yyyy-MM-dd");
const toTimeInput = (iso: string) => format(parseISO(iso), "HH:mm");

const isScheduleExpired = (schedule: ScheduleData): boolean => {
  const departure = parseISO(schedule.departureAt);
  const now = new Date();
  return departure < now;
};

const getDisplayStatus = (schedule: ScheduleData): string => {
  if (isScheduleExpired(schedule)) {
    return "expired";
  }
  return schedule.status;
};

const AdminSchedules = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [routeList, setRouteList] = useState<RouteData[]>([]);
  const [jeepneyList, setJeepneyList] = useState<JeepneyData[]>([]);
  const [scheduleList, setScheduleList] = useState<ScheduleData[]>([]);

  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ScheduleStatus>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleData | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadReferenceData = async () => {
    try {
      const [routePayload, jeepneyPayload] = await Promise.all([
        getRoutesRequest({ isActive: true }),
        getAdminJeepneysRequest({ status: "active" }),
      ]);
      setRouteList(routePayload.routes || []);
      setJeepneyList(jeepneyPayload.jeepneys || []);
    } catch {
      setRouteList([]);
      setJeepneyList([]);
    }
  };

  const loadSchedules = async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const payload = await getAdminSchedulesRequest({
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
    void loadReferenceData();
  }, []);

  useEffect(() => {
    void loadSchedules(true);
  }, [routeFilter, statusFilter, dateFilter]);

  const jeepneyOptionsForForm = useMemo(() => {
    if (!form.routeId) return jeepneyList;
    return jeepneyList.filter((j) => j.route?.id === form.routeId);
  }, [jeepneyList, form.routeId]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.routeId) nextErrors.routeId = "Required";
    if (!form.jeepneyId) nextErrors.jeepneyId = "Required";
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

  const resetForm = () => {
    setForm(emptyForm);
    setErrors({});
  };

  const openAdd = () => {
    resetForm();
    setAddOpen(true);
  };

  const openEdit = (schedule: ScheduleData) => {
    if (isScheduleExpired(schedule)) return;
    
    setSelectedSchedule(schedule);
    setForm({
      routeId: schedule.route?.id || "",
      jeepneyId: schedule.jeepney?.id || "",
      date: toDateInput(schedule.departureAt),
      departure: toTimeInput(schedule.departureAt),
      arrival: toTimeInput(schedule.arrivalAt),
      status: schedule.status,
    });
    setErrors({});
    setEditOpen(true);
  };

  const handleAdd = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await createAdminScheduleRequest({
        routeId: form.routeId,
        jeepneyId: form.jeepneyId,
        departureAt: combineDateTimeToIso(form.date, form.departure),
        arrivalAt: combineDateTimeToIso(form.date, form.arrival),
        status: form.status,
      });

      setAddOpen(false);
      resetForm();
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
      await updateAdminScheduleRequest(selectedSchedule.id, {
        routeId: form.routeId,
        jeepneyId: form.jeepneyId,
        departureAt: combineDateTimeToIso(form.date, form.departure),
        arrivalAt: combineDateTimeToIso(form.date, form.arrival),
        status: form.status,
      });

      setEditOpen(false);
      setSelectedSchedule(null);
      resetForm();
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
      await deleteAdminScheduleRequest(selectedSchedule.id);
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

  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Route *</Label>
        <Select
          value={form.routeId}
          onValueChange={(value) => setForm((prev) => ({ ...prev, routeId: value, jeepneyId: "" }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select route" />
          </SelectTrigger>
          <SelectContent>
            {routeList.map((route) => (
              <SelectItem key={route.id} value={route.id}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.routeId ? <p className="text-xs text-destructive">{errors.routeId}</p> : null}
      </div>

      <div className="space-y-2">
        <Label>Jeepney *</Label>
        <Select
          value={form.jeepneyId}
          onValueChange={(value) => setForm((prev) => ({ ...prev, jeepneyId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select jeepney" />
          </SelectTrigger>
          <SelectContent>
            {jeepneyOptionsForForm.map((jeepney) => (
              <SelectItem key={jeepney.id} value={jeepney.id}>
                {jeepney.code} ({jeepney.plateNumber})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.jeepneyId ? <p className="text-xs text-destructive">{errors.jeepneyId}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          {errors.date ? <p className="text-xs text-destructive">{errors.date}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select
            value={form.status}
            onValueChange={(value: ScheduleStatus) =>
              setForm((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Departure *</Label>
          <Input
            type="time"
            value={form.departure}
            onChange={(event) => setForm((prev) => ({ ...prev, departure: event.target.value }))}
          />
          {errors.departure ? <p className="text-xs text-destructive">{errors.departure}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Arrival *</Label>
          <Input
            type="time"
            value={form.arrival}
            onChange={(event) => setForm((prev) => ({ ...prev, arrival: event.target.value }))}
          />
          {errors.arrival ? <p className="text-xs text-destructive">{errors.arrival}</p> : null}
        </div>
      </div>
    </div>
  );

  const filteredSchedules = useMemo(() => scheduleList, [scheduleList]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        {[1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Manage Schedules</h1>
          <p className="text-sm text-muted-foreground">Create and maintain route departures.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void loadSchedules()}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Schedule
          </Button>
        </div>
      </div>

      <Card className="card-shadow border-0">
        <CardContent className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Route</Label>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value: "all" | ScheduleStatus) => setStatusFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <Card className="card-shadow border-0">
          <CardContent className="py-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={() => void loadSchedules()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredSchedules.length === 0 ? (
        <Card className="card-shadow border-0">
          <CardContent className="py-12 text-center space-y-3">
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">No schedules found for selected filters.</p>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow border-0">
          <CardHeader>
            <CardTitle className="text-base">Schedules ({filteredSchedules.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Jeepney</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{schedule.route?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.route?.origin || "-"} to {schedule.route?.destination || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{schedule.jeepney?.code || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.jeepney?.plateNumber || "No plate"}
                      </div>
                    </TableCell>
                    <TableCell>{format(parseISO(schedule.departureAt), "MMM dd, yyyy hh:mm a")}</TableCell>
                    <TableCell>{format(parseISO(schedule.arrivalAt), "MMM dd, yyyy hh:mm a")}</TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {schedule.availableSeats}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[getDisplayStatus(schedule) as ScheduleStatus | "expired"]}>{getDisplayStatus(schedule)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEdit(schedule)}
                          disabled={isScheduleExpired(schedule)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogDescription>Create a new schedule for a jeepney and route.</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleAdd()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Update schedule details and status.</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setSelectedSchedule(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleEdit()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The schedule will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSchedules;
