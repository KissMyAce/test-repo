import { useEffect, useMemo, useState } from "react";
import { Bus, Search, Pencil, Trash2, Eye, AlertTriangle, Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  getApprovedDriversRequest,
  deleteJeepneyRequest,
  getAdminJeepneysRequest,
  getRoutesRequest,
  JeepneyData,
  RouteData,
  updateJeepneyRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

interface DriverOption {
  id: string;
  name: string;
}

interface JeepneyView {
  id: string;
  code: string;
  plateNumber: string;
  driverId: string;
  driverName: string;
  driverLicense?: string | null;
  route: {
    id: string;
    name: string;
    from: string;
    to: string;
  };
  capacity: number;
  status: "active" | "inactive";
  photoUrl?: string | null;
}

const mapJeepney = (j: JeepneyData): JeepneyView => ({
  id: j.id,
  code: j.code,
  plateNumber: j.plateNumber,
  driverId: j.driver?.id || "",
  driverName: j.driver?.name || "Unassigned",
  driverLicense: (j.driver as any)?.licenseNumber || null,
  route: {
    id: j.route?.id || "",
    name: j.route?.name || "No route",
    from: j.route?.origin || "-",
    to: j.route?.destination || "-",
  },
  capacity: j.capacity,
  status: j.status,
  photoUrl: j.photoUrl || null,
});

const AdminJeepneys = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jeepneyList, setJeepneyList] = useState<JeepneyView[]>([]);
  const [routeList, setRouteList] = useState<RouteData[]>([]);
  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);

  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<JeepneyView | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    plateNumber: "",
    driverId: "",
    routeId: "",
    capacity: 20,
    status: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadAll = async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const [jeepneyPayload, routePayload, approvedPayload] = await Promise.all([
        getAdminJeepneysRequest({ status: "active" }),
        getRoutesRequest({ isActive: true }),
        getApprovedDriversRequest(),
      ]);

      const mappedJeepneys = (jeepneyPayload.jeepneys || []).map(mapJeepney);
      const mappedRoutes = routePayload.routes || [];
      const approvedDrivers = Array.isArray(approvedPayload)
        ? approvedPayload
        : approvedPayload.drivers || [];

      const driverMap = new Map<string, string>();
      mappedJeepneys.forEach((j) => {
        if (j.driverId) driverMap.set(j.driverId, j.driverName);
      });
      approvedDrivers.forEach((d) => {
        const id = d.user?.id || d.userId || "";
        const name = d.user?.name || "";
        if (id && name) driverMap.set(id, name);
      });

      setJeepneyList(mappedJeepneys);
      setRouteList(mappedRoutes);
      setDriverOptions(
        Array.from(driverMap.entries()).map(([id, name]) => ({ id, name }))
      );
    } catch (error) {
      let description = "Unable to load jeepneys.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Load failed", description, variant: "destructive" });
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAll(true);
  }, []);

  const filtered = useMemo(() => {
    return jeepneyList.filter((j) => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        j.code.toLowerCase().includes(s) ||
        j.plateNumber.toLowerCase().includes(s) ||
        j.driverName.toLowerCase().includes(s);
      const matchRoute = routeFilter === "all" || j.route.id === routeFilter;
      return matchSearch && matchRoute;
    });
  }, [jeepneyList, search, routeFilter]);

  const resetForm = () => {
    setForm({ code: "", plateNumber: "", driverId: "", routeId: "", capacity: 20, status: true });
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Required";
    if (!form.plateNumber.trim()) e.plateNumber = "Required";
    if (!form.driverId) e.driverId = "Required";
    if (!form.routeId) e.routeId = "Required";
    if (form.capacity < 1 || form.capacity > 40) e.capacity = "Must be 1–40";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openEdit = (j: JeepneyView) => {
    setSelected(j);
    setForm({
      code: j.code,
      plateNumber: j.plateNumber,
      driverId: j.driverId,
      routeId: j.route.id,
      capacity: j.capacity,
      status: j.status === "active",
    });
    setErrors({});
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!validate() || !selected) return;
    setSaving(true);
    try {
      const payload = await updateJeepneyRequest(selected.id, {
        code: form.code.trim(),
        plateNumber: form.plateNumber.trim(),
        driverId: form.driverId,
        routeId: form.routeId,
        capacity: form.capacity,
        status: form.status ? "active" : "inactive",
      });

      const updated = mapJeepney(payload.jeepney);
      setJeepneyList((prev) => prev.map((j) => (j.id === selected.id ? updated : j)));
      setEditOpen(false);
      setSelected(null);
      resetForm();
      toast({ title: "Jeepney updated", description: "Changes saved." });
    } catch (error) {
      let description = "Unable to update jeepney.";
      if (error instanceof ApiError && error.status === 404) description = "Jeepney not found.";
      else if (error instanceof ApiError && error.status >= 500) description = "Server error. Please try again shortly.";
      toast({ title: "Update failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteJeepneyRequest(selected.id);
      setJeepneyList((prev) => prev.filter((j) => j.id !== selected.id));
      setDeleteOpen(false);
      setSelected(null);
      toast({ title: "Jeepney deleted", variant: "destructive" });
    } catch (error) {
      let description = "Unable to delete jeepney.";
      if (error instanceof ApiError && error.status >= 500) description = "Server error. Please try again shortly.";
      toast({ title: "Delete failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Jeepney Code *</Label>
        <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. JEEP-001" />
        {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
      </div>
      <div className="space-y-2">
        <Label>Plate Number *</Label>
        <Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} placeholder="e.g. ABC-1234" />
        {errors.plateNumber && <p className="text-xs text-destructive">{errors.plateNumber}</p>}
      </div>
      <div className="space-y-2">
        <Label>Driver *</Label>
        <Select value={form.driverId} onValueChange={(v) => setForm({ ...form, driverId: v })}>
          <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
          <SelectContent>
            {driverOptions.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.driverId && <p className="text-xs text-destructive">{errors.driverId}</p>}
      </div>
      <div className="space-y-2">
        <Label>Route *</Label>
        <Select value={form.routeId} onValueChange={(v) => setForm({ ...form, routeId: v })}>
          <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
          <SelectContent>
            {routeList.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name} — {r.origin} → {r.destination}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.routeId && <p className="text-xs text-destructive">{errors.routeId}</p>}
      </div>
      <div className="space-y-2">
        <Label>Capacity (1–40) *</Label>
        <Input type="number" min={1} max={40} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
        {errors.capacity && <p className="text-xs text-destructive">{errors.capacity}</p>}
      </div>
      <div className="flex items-center justify-between">
        <Label>Status</Label>
        <Select value={form.status ? "active" : "inactive"} onValueChange={(v) => setForm({ ...form, status: v === "active" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Jeepneys</h1>
          <p className="text-sm text-muted-foreground">Showing approved/active jeepneys in the admin dashboard.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadAll(false)} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search code, plate, driver..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={routeFilter} onValueChange={setRouteFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Routes</SelectItem>
            {routeList.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="card-shadow border-0">
          <CardContent className="py-12 text-center space-y-3">
            <Bus className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">No jeepneys found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filtered.map((j) => (
              <Card key={j.id} className="card-shadow border-0">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-24 h-16 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                      {j.photoUrl ? (
                        <img src={j.photoUrl} alt={j.code} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/40">
                          <Bus className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{j.code}</p>
                      <p className="text-xs text-muted-foreground">{j.plateNumber}</p>
                    </div>
                    <Badge className={`text-[10px] ${j.status === "active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                      {j.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Driver: {j.driverName}</p>
                    <p>License: {j.driverLicense || "—"}</p>
                    <p>Route: {j.route.name}</p>
                    <p>Capacity: {j.capacity}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelected(j); setViewOpen(true); }}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(j)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setSelected(j); setDeleteOpen(true); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="card-shadow border-0 hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Driver License</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>
                        <div className="w-16 h-10 rounded-md overflow-hidden bg-secondary">
                          {j.photoUrl ? (
                            <img src={j.photoUrl} alt={j.code} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary/40">
                              <Bus className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{j.code}</TableCell>
                      <TableCell className="text-xs">{j.plateNumber}</TableCell>
                        <TableCell className="text-xs">{j.driverName}</TableCell>
                        <TableCell className="text-xs">{j.driverLicense || "—"}</TableCell>
                      <TableCell className="text-xs">{j.route.name}</TableCell>
                      <TableCell className="text-xs">{j.capacity}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${j.status === "active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                          {j.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelected(j); setViewOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(j)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => { setSelected(j); setDeleteOpen(true); }}>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Jeepney</DialogTitle>
            <DialogDescription>Update jeepney details.</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Jeepney</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              This will deactivate the jeepney in the backend.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{selected?.code}</span>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Jeepney Details</SheetTitle>
            <SheetDescription>Detailed information about this jeepney.</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 mt-6">
                  <div className="w-full h-40 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
                    {selected.photoUrl ? (
                      <img src={selected.photoUrl} alt={selected.code} className="w-full h-full object-cover" />
                    ) : (
                      <Bus className="w-16 h-16 text-primary/40" />
                    )}
                  </div>
              <div className="space-y-4">
                {[
                  { label: "Code", value: selected.code },
                  { label: "Plate", value: selected.plateNumber },
                  { label: "Driver", value: selected.driverName },
                  { label: "Route", value: `${selected.route.name} — ${selected.route.from} → ${selected.route.to}` },
                  { label: "Capacity", value: `${selected.capacity} seats` },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminJeepneys;
