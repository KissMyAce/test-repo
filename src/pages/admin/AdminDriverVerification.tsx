import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveDriverRequest,
  getPendingDriversRequest,
  PendingDriverProfile,
  rejectDriverRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

const normalizePendingDrivers = (
  payload: PendingDriverProfile[] | { drivers?: PendingDriverProfile[] }
): PendingDriverProfile[] => {
  if (Array.isArray(payload)) return payload;
  return payload.drivers || [];
};

const resolveUserId = (driver: PendingDriverProfile) =>
  driver.userId || driver.user?.id || "";

const resolveName = (driver: PendingDriverProfile) =>
  driver.user?.name || "Unnamed driver";

const resolveEmail = (driver: PendingDriverProfile) =>
  driver.user?.email || "no-email";

const resolvePhone = (driver: PendingDriverProfile) =>
  driver.user?.phone || "No phone";

const AdminDriverVerification = () => {
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [reasonByUserId, setReasonByUserId] = useState<Record<string, string>>({});
  const [drivers, setDrivers] = useState<PendingDriverProfile[]>([]);

  const pendingDrivers = useMemo(
    () => drivers.filter((d) => (d.approvalStatus || "pending") === "pending"),
    [drivers]
  );

  const loadPendingDrivers = async () => {
    setLoading(true);
    try {
      const payload = await getPendingDriversRequest();
      setDrivers(normalizePendingDrivers(payload));
    } catch (error) {
      let description = "Unable to load pending drivers.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Load failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPendingDrivers();
  }, []);

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
      setDrivers((prev) => prev.filter((d) => resolveUserId(d) !== userId));
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
      setDrivers((prev) => prev.filter((d) => resolveUserId(d) !== userId));
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

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Driver Verification Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading pending drivers...
            </div>
          ) : pendingDrivers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3">No pending driver applications.</div>
          ) : (
            <div className="space-y-4">
              {pendingDrivers.map((driver) => {
                const userId = resolveUserId(driver);
                const isBusy = busyUserId === userId;

                return (
                  <div key={userId || `${resolveEmail(driver)}-${driver.licenseNumber}`} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{resolveName(driver)}</p>
                        <p className="text-xs text-muted-foreground">{resolveEmail(driver)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{resolvePhone(driver)}</p>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>License Number: <span className="text-foreground">{driver.licenseNumber || "N/A"}</span></p>
                      <p>License File Key: <span className="text-foreground break-all">{driver.licenseFileKey || "N/A"}</span></p>
                      <p>NBI File Key: <span className="text-foreground break-all">{driver.nbiFileKey || "N/A"}</span></p>
                    </div>

                    <div className="space-y-1.5">
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

                    <div className="flex gap-2">
                      <Button
                        className="rounded-xl"
                        onClick={() => void handleApprove(driver)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl border-destructive text-destructive hover:bg-destructive/5"
                        onClick={() => void handleReject(driver)}
                        disabled={isBusy}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDriverVerification;
