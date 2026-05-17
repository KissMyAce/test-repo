import { useEffect, useMemo, useState } from "react";
import {
  Route as RouteIcon,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  AlertTriangle,
  Loader2,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  createRouteRequest,
  deleteRouteRequest,
  getAdminJeepneysRequest,
  getAdminSchedulesRequest,
  getRoutesRequest,
  JeepneyData,
  RouteData,
  ScheduleData,
  updateRouteRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

interface RouteWithFare {
  id: string;
  name: string;
  from: string;
  to: string;
  fare: number;
}

const mapApiRoute = (route: RouteData): RouteWithFare => ({
  id: route.id,
  name: route.name,
  from: route.origin,
  to: route.destination,
  fare: route.baseFare,
});

const getRouteActionErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  if (error.status === 400) return "Invalid route input. Please review the form.";
  if (error.status === 401) return "Your session expired. Please log in again.";
  if (error.status === 403) return "You are not allowed to manage routes.";
  if (error.status === 404) return "Route not found. Refresh and try again.";
  if (error.status === 409) return "Route conflict detected. Try a different value.";
  if (error.status >= 500) return "Server error. Please try again shortly.";
  return fallback;
};

const AdminRoutes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routeList, setRouteList] = useState<RouteWithFare[]>([]);
  const [jeepneyList, setJeepneyList] = useState<JeepneyData[]>([]);
  const [scheduleList, setScheduleList] = useState<ScheduleData[]>([]);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<RouteWithFare | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", from: "", to: "", fare: 45 });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadRoutes = async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const [routePayload, jeepneyPayload, schedulePayload] = await Promise.all([
        getRoutesRequest({ isActive: true }),
        getAdminJeepneysRequest(),
        getAdminSchedulesRequest(),
      ]);

      setRouteList((routePayload.routes || []).map(mapApiRoute));
      setJeepneyList(jeepneyPayload.jeepneys || []);
      setScheduleList(schedulePayload.schedules || []);
    } catch (error) {
      const description = getRouteActionErrorMessage(error, "Unable to load routes.");
      toast({ title: "Load failed", description, variant: "destructive" });
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRoutes(true);
  }, []);

  const resetForm = () => {
    setForm({ name: "", from: "", to: "", fare: 45 });
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.from.trim()) e.from = "Required";
    if (!form.to.trim()) e.to = "Required";
    if (form.fare <= 0) e.fare = "Must be > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const jeepneyCount = (routeId: string) =>
    jeepneyList.filter((jeepney) => jeepney.route?.id === routeId).length;

  const scheduleCount = (routeId: string) =>
    scheduleList.filter((schedule) => schedule.route?.id === routeId).length;

  const filteredRoutes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return routeList;
    return routeList.filter((route) => {
      return (
        route.name.toLowerCase().includes(keyword) ||
        route.from.toLowerCase().includes(keyword) ||
        route.to.toLowerCase().includes(keyword)
      );
    });
  }, [routeList, search]);

  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = await createRouteRequest({
        name: form.name.trim(),
        origin: form.from.trim(),
        destination: form.to.trim(),
        baseFare: form.fare,
      });
      const newRoute = mapApiRoute(payload.route);
      setAddOpen(false);
      resetForm();
      toast({ title: "Route added", description: `${newRoute.name} has been created.` });
      await loadRoutes();
    } catch (error) {
      const description = getRouteActionErrorMessage(error, "Unable to create route.");
      toast({ title: "Create failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (r: RouteWithFare) => {
    setSelected(r);
    setForm({ name: r.name, from: r.from, to: r.to, fare: r.fare });
    setErrors({});
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!validate() || !selected) return;
    setSaving(true);
    try {
      await updateRouteRequest(selected.id, {
        name: form.name.trim(),
        origin: form.from.trim(),
        destination: form.to.trim(),
        baseFare: form.fare,
      });
      setEditOpen(false);
      setSelected(null);
      resetForm();
      toast({ title: "Route updated", description: "Changes saved." });
      await loadRoutes();
    } catch (error) {
      const description = getRouteActionErrorMessage(error, "Unable to update route.");
      toast({ title: "Update failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteRouteRequest(selected.id);
      setDeleteOpen(false);
      setSelected(null);
      toast({ title: "Route deleted", variant: "destructive" });
      await loadRoutes();
    } catch (error) {
      const description = getRouteActionErrorMessage(error, "Unable to delete route.");
      toast({ title: "Delete failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Route Name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Route 12" />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label>Origin *</Label>
        <Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="e.g. SM City" />
        {errors.from && <p className="text-xs text-destructive">{errors.from}</p>}
      </div>
      <div className="space-y-2">
        <Label>Destination *</Label>
        <Input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="e.g. Ayala Terminal" />
        {errors.to && <p className="text-xs text-destructive">{errors.to}</p>}
      </div>
      <div className="space-y-2">
        <Label>Fare (₱) *</Label>
        <Input type="number" min={1} step={0.5} value={form.fare} onChange={(e) => setForm({ ...form, fare: parseFloat(e.target.value) || 0 })} />
        {errors.fare && <p className="text-xs text-destructive">{errors.fare}</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Manage Routes</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadRoutes()} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
          <Button onClick={() => { resetForm(); setAddOpen(true); }} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Route
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search route name, origin, destination..."
          className="pl-9"
        />
      </div>

      {/* List */}
      {filteredRoutes.length === 0 ? (
        <Card className="card-shadow border-0">
          <CardContent className="py-12 text-center space-y-3">
            <RouteIcon className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">
              {routeList.length === 0 ? "No routes yet." : "No routes match your search."}
            </p>
            <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Route
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filteredRoutes.map((r) => (
              <Card key={r.id} className="card-shadow border-0">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="icon-badge w-10 h-10 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.from} → {r.to}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary shrink-0">₱{r.fare}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-[10px]">{jeepneyCount(r.id)} jeepneys</Badge>
                      <Badge variant="secondary" className="text-[10px]">{scheduleCount(r.id)} schedules</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEdit(r)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => { setSelected(r); setDeleteOpen(true); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="card-shadow border-0 hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Fare</TableHead>
                    <TableHead>Jeepneys</TableHead>
                    <TableHead>Schedules</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="text-xs">{r.from}</TableCell>
                      <TableCell className="text-xs">{r.to}</TableCell>
                      <TableCell className="text-sm font-semibold text-primary">₱{r.fare}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{jeepneyCount(r.id)}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{scheduleCount(r.id)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(r)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => { setSelected(r); setDeleteOpen(true); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Route</DialogTitle>
            <DialogDescription>Create a new route for jeepneys.</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
            <DialogDescription>Update route information.</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {selected && (jeepneyCount(selected.id) > 0 || scheduleCount(selected.id) > 0) && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                This route has {jeepneyCount(selected.id)} jeepney(s) and {scheduleCount(selected.id)} schedule(s) associated. Deleting it will affect these records.
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{selected?.name}</span>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoutes;
