import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Bus, MapPin, Users, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getJeepneysRequest, getRoutesRequest, JeepneyData, RouteData } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

const Jeepneys = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jeepneyList, setJeepneyList] = useState<JeepneyData[]>([]);
  const [routeList, setRouteList] = useState<RouteData[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [jeepneyPayload, routePayload] = await Promise.all([
          getJeepneysRequest({ status: "active" }),
          getRoutesRequest({ isActive: true }),
        ]);
        if (!mounted) return;
        setJeepneyList(jeepneyPayload.jeepneys || []);
        setRouteList(routePayload.routes || []);
      } catch (error) {
        if (!mounted) return;
        let description = "Unable to load jeepneys.";
        if (error instanceof ApiError && error.status >= 500) {
          description = "Server error. Please try again shortly.";
        }
        toast({ title: "Load failed", description, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const filtered = useMemo(() => {
    return jeepneyList.filter((j) => {
      const matchSearch =
        !search ||
        j.code.toLowerCase().includes(search.toLowerCase()) ||
        j.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
        (j.driver?.name || "").toLowerCase().includes(search.toLowerCase());
      const matchRoute = !activeRoute || j.route?.id === activeRoute;
      return matchSearch && matchRoute;
    });
  }, [search, activeRoute, jeepneyList]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-foreground">Jeepneys</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, plate, or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Route Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        <button
          onClick={() => setActiveRoute(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !activeRoute
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          All
        </button>
        {routeList.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRoute(r.id === activeRoute ? null : r.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeRoute === r.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-4 card-shadow space-y-3">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-3">
            <Bus className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No jeepneys found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((j, i) => (
            <div
              key={j.id}
              className="bg-card rounded-2xl card-shadow overflow-hidden animate-slide-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              {/* Photo placeholder */}
              <div className="h-32 bg-primary flex items-center justify-center">
                <Bus className="w-12 h-12 text-primary-foreground/40" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{j.code}</h3>
                    <p className="text-xs text-muted-foreground">{j.plateNumber}</p>
                  </div>
                  <Badge
                    variant={j.status === "active" ? "default" : "secondary"}
                    className={
                      j.status === "active"
                        ? "bg-success text-success-foreground"
                        : ""
                    }
                  >
                    {j.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{j.driver?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{j.route?.origin || "—"} → {j.route?.destination || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {j.capacity} seats capacity
                    </span>
                  </div>
                </div>
                <Link to={`/jeepneys/${j.id}`}>
                  <Button variant="outline" size="sm" className="w-full rounded-xl mt-1">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jeepneys;
