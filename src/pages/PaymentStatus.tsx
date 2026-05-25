import { useSearchParams, Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getMyBookingByIdRequest, BookingPayload } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const { bookingId } = useParams<{ bookingId: string }>();
  const result = searchParams.get("result") || "success";
  const isSuccess = result === "success";
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBooking = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        const response = await getMyBookingByIdRequest(bookingId);
        setBooking(response.booking);
      } catch (error) {
        let description = "Unable to load booking.";
        if (error instanceof ApiError && error.status >= 500) {
          description = "Server error. Please try again shortly.";
        }
        toast({ title: "Load failed", description, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    void loadBooking();
  }, [bookingId, toast]);

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      {loading ? (
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="font-semibold text-foreground">Loading payment status...</p>
        </div>
      ) : (
        <>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isSuccess ? "bg-[hsl(152_60%_92%)]" : "bg-destructive/10"}`}>
            {isSuccess
              ? <CheckCircle2 className="w-10 h-10 text-[hsl(152_60%_42%)]" />
              : <XCircle className="w-10 h-10 text-destructive" />
            }
          </div>

          <h1 className={`text-2xl font-bold mb-2 ${isSuccess ? "text-[hsl(152_60%_42%)]" : "text-destructive"}`}>
            {isSuccess ? "Payment Successful!" : "Payment Failed"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {isSuccess
              ? "Your booking has been confirmed."
              : "Something went wrong. Please try again."
            }
          </p>

          {isSuccess && booking && (
            <Card className="w-full card-shadow border-0 mb-6">
              <CardContent className="p-5 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium">{booking.routeSnapshot ? `${booking.routeSnapshot.origin} → ${booking.routeSnapshot.destination}` : "Unknown"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-medium">{booking.seats}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Booking Ref</span><span className="font-mono text-xs">{booking.bookingRef}</span></div>
                <div className="flex justify-between border-t border-border pt-2 mt-2"><span className="font-semibold">Total Paid</span><span className="font-bold text-primary">₱{booking.totalFare}.00</span></div>
              </CardContent>
            </Card>
          )}

          <div className="w-full space-y-3">
            {isSuccess ? (
              <>
                <Button asChild className="w-full h-12 rounded-2xl font-semibold">
                  <Link to="/my-bookings">View My Bookings <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/dashboard">Go Home</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full h-12 rounded-2xl font-semibold">
                  <Link to={booking ? `/payment/${booking.id}` : "/booking"}>Retry Payment</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full text-destructive">
                  <Link to="/my-bookings">Cancel Booking</Link>
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentStatus;
