import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Clock,
  Bus,
  Users,
  Search,
  ChevronLeft,
  Minus,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  getRoutesRequest,
  getScheduleByIdRequest,
  getSchedulesRequest,
  createBookingRequest,
  RouteData,
  ScheduleData,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

const STEPS = ["Route", "Schedule", "Seats", "Review"];
const DEFAULT_PRICE_PER_SEAT = 45;

type BookingRoute = {
  id: string;
  name: string;
  from: string;
  to: string;
  baseFare: number;
};

type BookingSchedule = {
  id: string;
  route: BookingRoute;
  dateText: string;
  departureText: string;
  arrivalText: string;
  availableSeats: number;
  totalSeats: number;
  jeepneyName: string;
  jeepneyPlate: string;
};

const toBookingRoute = (route: RouteData): BookingRoute => ({
  id: route.id,
  name: route.name,
  from: route.origin,
  to: route.destination,
  baseFare: route.baseFare,
});

const toBookingSchedule = (schedule: ScheduleData, routeById: Map<string, BookingRoute>): BookingSchedule | null => {
  const routeId = schedule.route?.id;
  if (!routeId || !schedule.route) return null;

  const route =
    routeById.get(routeId) || {
      id: schedule.route.id,
      name: schedule.route.name,
      from: schedule.route.origin,
      to: schedule.route.destination,
      baseFare: DEFAULT_PRICE_PER_SEAT,
    };

  const departure = parseISO(schedule.departureAt);
  const arrival = parseISO(schedule.arrivalAt);

  return {
    id: schedule.id,
    route,
    dateText: format(departure, "yyyy-MM-dd"),
    departureText: format(departure, "hh:mm a"),
    arrivalText: format(arrival, "hh:mm a"),
    availableSeats: schedule.availableSeats ?? 0,
    totalSeats: schedule.jeepney?.capacity ?? 0,
    jeepneyName: schedule.jeepney?.code || "-",
    jeepneyPlate: schedule.jeepney?.plateNumber || "-",
  };
};

const Booking = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [step, setStep] = useState(0);
  const [routeList, setRouteList] = useState<BookingRoute[]>([]);
  const [scheduleList, setScheduleList] = useState<BookingSchedule[]>([]);

  const [selectedRoute, setSelectedRoute] = useState<BookingRoute | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<BookingSchedule | null>(null);
  const [seats, setSeats] = useState(1);

  const [routeSearch, setRouteSearch] = useState("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [bookingLoading, setBookingLoading] = useState(false);

  const maxSeats = selectedSchedule?.availableSeats || 0;

  useEffect(() => {
    let mounted = true;

    const loadRoutes = async () => {
      setLoadingRoutes(true);
      try {
        const payload = await getRoutesRequest({ isActive: true });
        if (!mounted) return;
        setRouteList((payload.routes || []).map(toBookingRoute));
      } catch (error) {
        if (!mounted) return;
        let description = "Unable to load routes.";
        if (error instanceof ApiError && error.status >= 500) {
          description = "Server error. Please try again shortly.";
        }
        toast({ title: "Load failed", description, variant: "destructive" });
        setRouteList([]);
      } finally {
        if (mounted) setLoadingRoutes(false);
      }
    };

    void loadRoutes();

    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    let mounted = true;

    const preSelectedScheduleId = searchParams.get("scheduleId");
    if (!preSelectedScheduleId || routeList.length === 0) return;

    const routeById = new Map(routeList.map((route) => [route.id, route]));

    const hydrateFromSchedule = async () => {
      setLoadingSchedules(true);
      try {
        const payload = await getScheduleByIdRequest(preSelectedScheduleId);
        if (!mounted || !payload.schedule) return;
        const mapped = toBookingSchedule(payload.schedule, routeById);
        if (!mapped) return;

        setSelectedRoute(mapped.route);
        setSelectedSchedule(mapped);
        setStep(2);
        setSeats(1);
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setLoadingSchedules(false);
      }
    };

    void hydrateFromSchedule();

    return () => {
      mounted = false;
    };
  }, [searchParams, routeList]);

  useEffect(() => {
    let mounted = true;

    const loadSchedules = async () => {
      if (!selectedRoute) {
        setScheduleList([]);
        return;
      }

      setLoadingSchedules(true);
      try {
        const routeById = new Map(routeList.map((route) => [route.id, route]));
        const payload = await getSchedulesRequest({
          routeId: selectedRoute.id,
          date: scheduleDate ? format(scheduleDate, "yyyy-MM-dd") : undefined,
        });

        if (!mounted) return;

        const mapped = (payload.schedules || [])
          .filter((schedule) => schedule.status !== "cancelled")
          .map((schedule) => toBookingSchedule(schedule, routeById))
          .filter((schedule): schedule is BookingSchedule => Boolean(schedule));

        setScheduleList(mapped);
      } catch (error) {
        if (!mounted) return;
        let description = "Unable to load schedules.";
        if (error instanceof ApiError && error.status >= 500) {
          description = "Server error. Please try again shortly.";
        }
        toast({ title: "Load failed", description, variant: "destructive" });
        setScheduleList([]);
      } finally {
        if (mounted) setLoadingSchedules(false);
      }
    };

    void loadSchedules();

    return () => {
      mounted = false;
    };
  }, [selectedRoute, scheduleDate, routeList, toast]);

  const filteredRoutes = useMemo(
    () =>
      routeList.filter(
        (route) =>
          !routeSearch ||
          route.name.toLowerCase().includes(routeSearch.toLowerCase()) ||
          route.from.toLowerCase().includes(routeSearch.toLowerCase()) ||
          route.to.toLowerCase().includes(routeSearch.toLowerCase())
      ),
    [routeList, routeSearch]
  );

  const goNext = () => setStep((value) => Math.min(value + 1, 3));
  const goBack = () => {
    if (step === 0) {
      navigate(-1);
      return;
    }
    setStep((value) => value - 1);
  };

  const handleConfirm = async () => {
    if (!selectedSchedule || !selectedSchedule.id) {
      toast({ title: "Error", description: "Please select a schedule", variant: "destructive" });
      return;
    }

    setBookingLoading(true);
    try {
      const response = await createBookingRequest({
        scheduleId: selectedSchedule.id,
        seats,
      });

      if (response.booking) {
        toast({ title: "Booking Created", description: "Proceeding to payment..." });
        navigate(`/payment/${response.booking.id}`);
      }
    } catch (error) {
      let description = "Unable to create booking.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Booking failed", description, variant: "destructive" });
    } finally {
      setBookingLoading(false);
    }
  };

  const totalPrice = seats * (selectedSchedule?.route.baseFare || DEFAULT_PRICE_PER_SEAT);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5 pb-28 lg:pb-8">
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Book a Ride</h1>
      </div>

      <div className="flex items-center gap-1">
        {STEPS.map((label, index) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-full h-1.5 rounded-full transition-all",
                index <= step ? "bg-primary" : "bg-secondary"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                index <= step ? "text-primary" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={routeSearch}
              onChange={(event) => setRouteSearch(event.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {loadingRoutes ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading routes...
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => {
                    setSelectedRoute(route);
                    setSelectedSchedule(null);
                    setSeats(1);
                    setStep(1);
                  }}
                  className={cn(
                    "w-full bg-card rounded-2xl p-4 card-shadow text-left transition-all hover:ring-2 hover:ring-primary/30",
                    selectedRoute?.id === route.id && "ring-2 ring-primary"
                  )}
                >
                  <p className="font-semibold text-foreground text-sm">{route.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {route.from} to {route.to}
                  </p>
                  <p className="text-xs text-primary mt-1 font-medium">Base fare: PHP {route.baseFare}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-secondary/50 rounded-xl p-3 text-sm">
            <span className="text-muted-foreground">Route: </span>
            <span className="font-medium text-foreground">
              {selectedRoute?.name} — {selectedRoute?.from} to {selectedRoute?.to}
            </span>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("rounded-xl gap-2", scheduleDate && "border-primary text-primary")}
              >
                <Calendar className="w-4 h-4" />
                {scheduleDate ? format(scheduleDate, "MMM d, yyyy") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker mode="single" selected={scheduleDate} onSelect={setScheduleDate} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {loadingSchedules ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading schedules...
            </div>
          ) : scheduleList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No schedules available</p>
          ) : (
            <div className="space-y-3">
              {scheduleList.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => {
                    setSelectedSchedule(schedule);
                    setSeats(1);
                    goNext();
                  }}
                  disabled={schedule.availableSeats === 0}
                  className={cn(
                    "w-full bg-card rounded-2xl p-4 card-shadow text-left transition-all",
                    schedule.availableSeats === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:ring-2 hover:ring-primary/30",
                    selectedSchedule?.id === schedule.id && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {schedule.departureText} to {schedule.arrivalText}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Bus className="w-3.5 h-3.5 text-primary" />
                        {schedule.jeepneyName}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {schedule.dateText}
                      </p>
                    </div>
                    <Badge variant={schedule.availableSeats === 0 ? "secondary" : "default"} className="text-[10px]">
                      {schedule.availableSeats === 0 ? "Full" : `${schedule.availableSeats} seats`}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedSchedule && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-card rounded-2xl p-5 card-shadow space-y-4">
            <h3 className="font-semibold text-foreground">Select Seats</h3>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setSeats((value) => Math.max(1, value - 1))}
                disabled={seats <= 1}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground disabled:opacity-40 transition-opacity"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-3xl font-bold text-foreground w-12 text-center">{seats}</span>
              <button
                onClick={() => setSeats((value) => Math.min(maxSeats, value + 1))}
                disabled={seats >= maxSeats}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground disabled:opacity-40 transition-opacity"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">{maxSeats} seats available</p>
          </div>

          <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
            <h3 className="font-semibold text-foreground">Summary</h3>
            <div className="text-sm space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>Route</span>
                <span className="text-foreground font-medium">{selectedSchedule.route.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Schedule</span>
                <span className="text-foreground font-medium">
                  {selectedSchedule.departureText} — {selectedSchedule.dateText}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Seats</span>
                <span className="text-foreground font-medium">{seats}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-primary text-base">PHP {totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button className="w-full rounded-xl h-12 font-semibold" onClick={goNext}>
            Continue to Review
          </Button>
        </div>
      )}

      {step === 3 && selectedSchedule && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-card rounded-2xl p-5 card-shadow space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-success" />
              </div>
              <h3 className="font-semibold text-foreground">Booking Summary</h3>
            </div>

            <div className="text-sm space-y-3 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Route</p>
                  <p className="text-foreground font-medium">
                    {selectedSchedule.route.name} — {selectedSchedule.route.from} to {selectedSchedule.route.to}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Date & Time</p>
                  <p className="text-foreground font-medium">
                    {selectedSchedule.dateText} • {selectedSchedule.departureText} to {selectedSchedule.arrivalText}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bus className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Jeepney</p>
                  <p className="text-foreground font-medium">
                    {selectedSchedule.jeepneyName} ({selectedSchedule.jeepneyPlate})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Seats</p>
                  <p className="text-foreground font-medium">{seats} seat{seats > 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">PHP {totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">
            By confirming, your booking will be created with status <span className="font-semibold text-foreground">pending</span>. You'll be redirected to complete payment.
          </div>

          <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleConfirm} disabled={bookingLoading}>
            {bookingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Continue to Payment"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Booking;
