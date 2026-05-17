import { useEffect, useRef, useState } from "react";
import {
  Bus,
  Camera,
  Edit,
  Save,
  X,
  MapPin,
  Users as UsersIcon,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  commitUploadRequest,
  getMyJeepneyRequest,
  getRoutesRequest,
  JeepneyData,
  presignUploadRequest,
  RouteData,
  updateMyJeepneyRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

const MAX_PHOTO_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png"];

type DriverJeepneyForm = {
  code: string;
  plateNumber: string;
  capacity: number;
  routeId: string;
  photoKey: string | null;
};

const toForm = (jeepney: JeepneyData): DriverJeepneyForm => ({
  code: jeepney.code || "",
  plateNumber: jeepney.plateNumber || "",
  capacity: jeepney.capacity || 20,
  routeId: jeepney.route?.id || "",
  photoKey: jeepney.photoKey || null,
});

const DriverJeepney = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [hasJeepney, setHasJeepney] = useState(true);
  const [jeepney, setJeepney] = useState<JeepneyData | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState<DriverJeepneyForm>({
    code: "",
    plateNumber: "",
    capacity: 20,
    routeId: "",
    photoKey: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [routePayload, myJeepneyPayload] = await Promise.all([
          getRoutesRequest({ isActive: true }),
          getMyJeepneyRequest(),
        ]);

        if (!mounted) return;
        setRoutes(routePayload.routes || []);
        setJeepney(myJeepneyPayload.jeepney);
        setForm(toForm(myJeepneyPayload.jeepney));
        setHasJeepney(true);
      } catch (error) {
        if (!mounted) return;

        if (error instanceof ApiError && error.status === 404) {
          setHasJeepney(false);
          try {
            const routePayload = await getRoutesRequest({ isActive: true });
            if (mounted) setRoutes(routePayload.routes || []);
          } catch {
            if (mounted) setRoutes([]);
          }
          return;
        }

        toast({
          title: "Load failed",
          description: "Unable to load jeepney details.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadData();

    return () => {
      mounted = false;
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, []);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.code.trim()) nextErrors.code = "Required";
    if (!form.plateNumber.trim()) nextErrors.plateNumber = "Required";
    if (!form.routeId) nextErrors.routeId = "Required";
    if (form.capacity < 1 || form.capacity > 40) nextErrors.capacity = "Must be 1-40";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast({
        title: "Invalid format",
        description: "Only JPG and PNG allowed.",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Max 2MB allowed.",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    setUploadingPhoto(true);
    try {
      const presign = await presignUploadRequest({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        purpose: "driver-photo",
      });

      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: presign.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      await commitUploadRequest({
        objectKey: presign.objectKey,
        purpose: "driver-photo",
      });

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(URL.createObjectURL(file));
      setForm((prev) => ({ ...prev, photoKey: presign.objectKey }));

      toast({ title: "Photo uploaded", description: "Photo will be saved when you click Save." });
    } catch {
      toast({
        title: "Upload failed",
        description: "Unable to upload photo right now.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      e.currentTarget.value = "";
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = await updateMyJeepneyRequest({
        code: form.code.trim(),
        plateNumber: form.plateNumber.trim(),
        routeId: form.routeId,
        capacity: form.capacity,
        photoKey: form.photoKey,
      });

      setJeepney(payload.jeepney);
      setForm(toForm(payload.jeepney));
      setEditing(false);
      setErrors({});
      toast({ title: "Saved", description: "Jeepney info updated." });
    } catch (error) {
      let description = "Unable to save jeepney info.";
      if (error instanceof ApiError && error.status === 400) {
        description = "Invalid fields. Please check the form values.";
      } else if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Save failed", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (jeepney) {
      setForm(toForm(jeepney));
    }
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    setErrors({});
    setEditing(false);
  };

  const selectedRoute = routes.find((route) => route.id === form.routeId);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-2xl">
        <Card className="card-shadow border-0">
          <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading jeepney...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasJeepney || !jeepney) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="icon-badge-lg mx-auto bg-muted text-muted-foreground">
            <Bus className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No Jeepney Assigned</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Contact your admin to assign a jeepney to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground">My Jeepney</h1>

      <Card className="card-shadow border-0 overflow-hidden">
        <div className="relative w-full aspect-video bg-secondary flex items-center justify-center">
          {photoPreview || jeepney.photoUrl ? (
            <img
              src={photoPreview || jeepney.photoUrl || ""}
              alt="Jeepney"
              className="w-full h-full object-cover"
            />
          ) : (
            <Bus className="w-16 h-16 text-primary/30" />
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!editing || uploadingPhoto}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-foreground/60 text-background text-xs font-medium backdrop-blur-sm hover:bg-foreground/80 transition-colors disabled:opacity-60"
          >
            {uploadingPhoto ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            Change Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(event) => void handlePhotoChange(event)}
          />
        </div>
      </Card>

      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Jeepney Details</CardTitle>
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4" /> Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Jeepney Code</Label>
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                  className={errors.code ? "border-destructive" : ""}
                />
                {errors.code && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.code}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Plate Number</Label>
                <Input
                  value={form.plateNumber}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, plateNumber: event.target.value }))
                  }
                  className={errors.plateNumber ? "border-destructive" : ""}
                />
                {errors.plateNumber && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.plateNumber}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={form.capacity}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      capacity: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                  className={errors.capacity ? "border-destructive" : ""}
                />
                {errors.capacity && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.capacity}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Route</Label>
                <Select
                  value={form.routeId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, routeId: value }))}
                >
                  <SelectTrigger className={errors.routeId ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name} - {route.origin} to {route.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.routeId && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.routeId}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <InfoRow label="Jeepney Code" value={form.code} />
              <InfoRow label="Plate Number" value={form.plateNumber} />
              <InfoRow
                label="Route"
                value={
                  selectedRoute
                    ? `${selectedRoute.name} - ${selectedRoute.origin} to ${selectedRoute.destination}`
                    : "-"
                }
                icon={<MapPin className="w-3 h-3 text-primary" />}
              />
              <InfoRow
                label="Capacity"
                value={`${form.capacity} seats`}
                icon={<UsersIcon className="w-3 h-3 text-primary" />}
              />
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge
                  className={
                    jeepney.status === "active"
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {jeepney.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground flex items-center gap-1">
      {icon}
      {value}
    </span>
  </div>
);

export default DriverJeepney;
