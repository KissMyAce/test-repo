import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, Plus, Pencil, ShieldAlert, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  approveDriverRequest,
  createAdminUserRequest,
  deleteAdminUserRequest,
  getAdminUsersRequest,
  getAdminJeepneysRequest,
  getDriverDocumentUrlRequest,
  getPendingDriversRequest,
  updateAdminUserRequest,
  PendingDriverProfile,
  AdminUser,
  JeepneyData,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

const normalizePendingDrivers = (
  payload: PendingDriverProfile[] | { drivers?: PendingDriverProfile[] }
): PendingDriverProfile[] => {
  if (Array.isArray(payload)) return payload;
  return payload.drivers || [];
};

const resolveUserId = (driver: PendingDriverProfile) => driver.userId || driver.user?.id || "";

const resolveName = (driver: PendingDriverProfile) => driver.user?.name || "Unnamed driver";

const resolveEmail = (driver: PendingDriverProfile) => driver.user?.email || "no-email";

const resolvePhone = (driver: PendingDriverProfile) => driver.user?.phone || "No phone";

const defaultFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "passenger" as "passenger" | "driver",
  status: "active" as "active" | "pending_verification" | "suspended",
  licenseNumber: "",
  licenseFileKey: "",
  nbiFileKey: "",
};

const AdminDriverVerification = () => {
  const [activeTab, setActiveTab] = useState<"passengers" | "drivers" | "queue">("passengers");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriverProfile[]>([]);
  const [pendingJeepneys, setPendingJeepneys] = useState<JeepneyData[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(defaultFormState);
  const [reasonByUserId, setReasonByUserId] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const filteredPendingDrivers = useMemo(
    () =>
      pendingDrivers.filter((driver) => {
        if (!search.trim()) return true;
        const text = search.toLowerCase();
        return [resolveName(driver), resolveEmail(driver), resolvePhone(driver), driver.licenseNumber || "", driver.licenseFileKey || "", driver.nbiFileKey || ""].some((value) =>
          value.toLowerCase().includes(text)
        );
      }),
    [pendingDrivers, search]
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const role = activeTab === "passengers" ? "passenger" : "driver";
      const { users } = await getAdminUsersRequest({ search: search.trim(), role });
      setUsers(users);
    } catch (error) {
      let description = "Unable to load users.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Load failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingDrivers = async () => {
    setLoading(true);
    try {
      const [driverPayload, jeepneyPayload] = await Promise.all([
        getPendingDriversRequest(),
        getAdminJeepneysRequest({ status: "inactive" }),
      ]);
      setPendingDrivers(normalizePendingDrivers(driverPayload));
      setPendingJeepneys(jeepneyPayload.jeepneys || []);
    } catch (error) {
      let description = "Unable to load pending items.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Load failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "queue") {
      void loadPendingDrivers();
    } else {
      void loadUsers();
    }
  }, [activeTab, search]);

  const openAdd = () => {
    setForm(defaultFormState);
    setAddOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role === "driver" ? "driver" : "passenger",
      status: user.status,
      licenseNumber: user.driverProfile?.licenseNumber || "",
      licenseFileKey: user.driverProfile?.licenseFileKey || "",
      nbiFileKey: user.driverProfile?.nbiFileKey || "",
    });
    setEditOpen(true);
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      if (selectedUser) {
        await updateAdminUserRequest(selectedUser.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          status: form.status,
          ...(form.role === "driver"
            ? {
                driverProfile: {
                  licenseNumber: form.licenseNumber || undefined,
                  licenseFileKey: form.licenseFileKey || undefined,
                  nbiFileKey: form.nbiFileKey || undefined,
                },
              }
            : {}),
          ...(form.password ? { password: form.password } : {}),
        });
        toast({ title: "User updated", description: "The user record has been saved." });
      } else {
        await createAdminUserRequest({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role: form.role,
          licenseNumber: form.role === "driver" ? form.licenseNumber || undefined : undefined,
          licenseFileKey: form.role === "driver" ? form.licenseFileKey || undefined : undefined,
          nbiFileKey: form.role === "driver" ? form.nbiFileKey || undefined : undefined,
        });
        toast({ title: "User created", description: "A new user has been created." });
      }

      setSelectedUser(null);
      setAddOpen(false);
      setEditOpen(false);
      void loadUsers();
    } catch (error) {
      let description = "Unable to save user.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Save failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = window.confirm(`Delete ${user.name}? This action cannot be undone.`);
    if (!confirmed) return;

    setBusyUserId(user.id);
    try {
      await deleteAdminUserRequest(user.id);
      toast({ title: "User deleted", description: "The account has been removed." });
      void loadUsers();
    } catch (error) {
      let description = "Unable to delete user.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Delete failed", description, variant: "destructive" });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleViewDocument = async (objectKey?: string) => {
    if (!objectKey) {
      toast({ title: "No document", description: "This record has no file key.", variant: "destructive" });
      return;
    }

    try {
      const { url } = await getDriverDocumentUrlRequest(objectKey);
      window.open(url, "_blank");
    } catch (error) {
      let description = "Unable to open document.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Preview failed", description, variant: "destructive" });
    }
  };

  const handleApprove = async (driver: PendingDriverProfile) => {
    const userId = resolveUserId(driver);
    if (!userId) {
      toast({ title: "Approval failed", description: "Missing user id.", variant: "destructive" });
      return;
    }

    setBusyUserId(userId);
    try {
      await approveDriverRequest(userId, {
        reviewNotes: reasonByUserId[userId]?.trim() || undefined,
      });
      setPendingDrivers((prev) => prev.filter((d) => resolveUserId(d) !== userId));
      toast({ title: "Driver approved", description: "Driver can now access driver routes." });
    } catch (error) {
      let description = "Unable to approve driver.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Approval failed", description, variant: "destructive" });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleReject = async (driver: PendingDriverProfile) => {
    const userId = resolveUserId(driver);
    const reason = reasonByUserId[userId]?.trim() || "Application did not pass verification.";

    if (!userId) {
      toast({ title: "Rejection failed", description: "Missing user id.", variant: "destructive" });
      return;
    }

    setBusyUserId(userId);
    try {
      await rejectDriverRequest(userId, { reason });
      setPendingDrivers((prev) => prev.filter((d) => resolveUserId(d) !== userId));
      toast({ title: "Driver rejected", description: "Application was rejected." });
    } catch (error) {
      let description = "Unable to reject driver.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Rejection failed", description, variant: "destructive" });
    } finally {
      setBusyUserId(null);
    }
  };

  const activeUsers = useMemo(() => users, [users]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl space-y-4">
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              User Management
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Manage passengers, drivers, and driver verification records from a single admin console.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {activeTab !== "queue" && (
              <Button size="sm" onClick={openAdd} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add User
              </Button>
            )}
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users, emails, phone numbers..."
              className="max-w-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="passengers">Passengers</TabsTrigger>
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
              <TabsTrigger value="queue">Verification Queue</TabsTrigger>
            </TabsList>

            <TabsContent value="passengers">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 inline-block animate-spin" /> Loading passengers...
                        </TableCell>
                      </TableRow>
                    ) : activeUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          No passengers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${
                              user.status === "active"
                                ? "bg-success text-success-foreground"
                                : user.status === "pending_verification"
                                ? "bg-warning text-warning-foreground"
                                : "bg-destructive text-destructive-foreground"
                            }`}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(user)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => handleDelete(user)}
                                disabled={busyUserId === user.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="drivers">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 inline-block animate-spin" /> Loading drivers...
                        </TableCell>
                      </TableRow>
                    ) : activeUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          No drivers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${
                              user.status === "active"
                                ? "bg-success text-success-foreground"
                                : user.status === "pending_verification"
                                ? "bg-warning text-warning-foreground"
                                : "bg-destructive text-destructive-foreground"
                            }`}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(user)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => handleDelete(user)}
                                disabled={busyUserId === user.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="queue">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading pending verification items...
                </div>
              ) : filteredPendingDrivers.length === 0 && pendingJeepneys.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6">No pending driver or jeepney applications.</div>
              ) : (
                <div className="space-y-6">
                  {filteredPendingDrivers.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-foreground">Pending driver applications</p>
                      {filteredPendingDrivers.map((driver) => {
                        const userId = resolveUserId(driver);
                        const isBusy = busyUserId === userId;

                        return (
                          <div key={userId || `${resolveEmail(driver)}-${driver.licenseNumber}`} className="rounded-xl border border-border p-4 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{resolveName(driver)}</p>
                                <p className="text-xs text-muted-foreground">{resolveEmail(driver)}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{resolvePhone(driver)}</p>
                              </div>
                              <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">License Number</p>
                                <p className="text-sm text-foreground">{driver.licenseNumber || "N/A"}</p>
                              </div>
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">Driver License</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => void handleViewDocument(driver.licenseFileKey)}>
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </Button>
                                </div>
                              </div>
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">Jeepney Name</p>
                                <p className="text-sm text-foreground">{driver.jeepneyCode || "N/A"}</p>
                              </div>
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">Plate Number</p>
                                <p className="text-sm text-foreground">{driver.jeepneyPlateNumber || "N/A"}</p>
                              </div>
                              <div className="rounded-xl border border-border p-3 sm:col-span-2">
                                <p className="text-xs text-muted-foreground">NBI Document</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => void handleViewDocument(driver.nbiFileKey || undefined)}>
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {driver.jeepneyPhotoKey ? (
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">Jeepney Photo</p>
                                <div className="mt-3 flex flex-col gap-3">
                                  {driver.jeepneyPhotoUrl ? (
                                    <div className="w-full max-w-sm overflow-hidden rounded-xl bg-secondary">
                                      <img src={driver.jeepneyPhotoUrl} alt="Jeepney photo" className="w-full h-40 object-cover" />
                                    </div>
                                  ) : (
                                    <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                                      No preview URL available. View via direct link.
                                    </div>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => void handleViewDocument(driver.jeepneyPhotoKey || undefined)}>
                                    <Eye className="w-3.5 h-3.5" /> View full photo
                                  </Button>
                                </div>
                              </div>
                            ) : null}

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Review Note / Rejection Reason</Label>
                              <Input
                                value={reasonByUserId[userId] || ""}
                                onChange={(e) =>
                                  setReasonByUserId((prev) => ({
                                    ...prev,
                                    [userId]: e.target.value,
                                  }))
                                }
                                placeholder="Optional for approve, used as reason for reject"
                                className="rounded-xl h-10"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => void handleApprove(driver)} disabled={isBusy}>
                                {isBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                Approve
                              </Button>
                              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/5" onClick={() => void handleReject(driver)} disabled={isBusy}>
                                <X className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {pendingJeepneys.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-foreground">Pending jeepney applications</p>
                      <div className="space-y-4">
                        {pendingJeepneys.map((jeepney) => (
                          <div key={jeepney.id} className="rounded-xl border border-border p-4 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{jeepney.name || jeepney.code || "Unnamed jeepney"}</p>
                                <p className="text-xs text-muted-foreground">Plate: {jeepney.plateNumber || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">Route: {jeepney.route?.name || jeepney.routeName || "Unknown route"}</p>
                                <p className="text-xs text-muted-foreground">Capacity: {jeepney.capacity || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">Driver: {jeepney.driver?.name || jeepney.driverName || "Unknown"}</p>
                              </div>
                              <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                            </div>
                            {jeepney.photoUrl ? (
                              <div className="w-full max-w-sm overflow-hidden rounded-xl bg-secondary">
                                <img src={jeepney.photoUrl} alt="Jeepney photo" className="w-full h-40 object-cover" />
                              </div>
                            ) : jeepney.photoKey ? (
                              <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                                Jeepney photo uploaded, no preview URL available.
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new passenger or driver account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as "passenger" | "driver" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passenger">Passenger</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
            </div>
            {form.role === "driver" && (
              <>
                <div>
                  <Label>License Number</Label>
                  <Input value={form.licenseNumber} onChange={(e) => setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>License File Key</Label>
                  <Input value={form.licenseFileKey} onChange={(e) => setForm((prev) => ({ ...prev, licenseFileKey: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>NBI File Key</Label>
                  <Input value={form.nbiFileKey} onChange={(e) => setForm((prev) => ({ ...prev, nbiFileKey: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving || !form.name || !form.email || !form.password || (form.role === "driver" && !form.licenseFileKey)}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setSelectedUser(null); setEditOpen(open); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update account information and driver profile if available.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as "active" | "pending_verification" | "suspended" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
            </div>
            {form.role === "driver" && (
              <>
                <div>
                  <Label>License Number</Label>
                  <Input value={form.licenseNumber} onChange={(e) => setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>License File Key</Label>
                  <Input value={form.licenseFileKey} onChange={(e) => setForm((prev) => ({ ...prev, licenseFileKey: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>NBI File Key</Label>
                  <Input value={form.nbiFileKey} onChange={(e) => setForm((prev) => ({ ...prev, nbiFileKey: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditOpen(false); setSelectedUser(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving || !form.name || !form.email}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDriverVerification;
