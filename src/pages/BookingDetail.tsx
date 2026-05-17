import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { MapPin, Clock, Bus, User, CreditCard, Copy, ArrowLeft, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { bookings, type Booking } from "@/data/mock-data";

const statusBanner: Record<Booking["status"], { bg: string; text: string }> = {
  pending: { bg: "bg-[hsl(38_92%_90%)]", text: "text-[hsl(38_92%_35%)]" },
  confirmed: { bg: "bg-[hsl(217_72%_92%)]", text: "text-primary" },
  completed: { bg: "bg-[hsl(152_60%_90%)]", text: "text-[hsl(152_60%_32%)]" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive" },
};

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const booking = bookings.find((b) => b.id === id);

  if (!booking) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Booking not found</p>
        <Button asChild variant="ghost" className="mt-4"><Link to="/my-bookings">Back to Bookings</Link></Button>
      </div>
    );
  }

  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const banner = statusBanner[booking.status];

  const handleCopy = () => {
    navigator.clipboard.writeText(booking.reference);
    toast({ title: "Copied!", description: "Reference ID copied to clipboard" });
  };

  const handleCancel = () => {
    setCancelOpen(false);
    toast({ title: "Booking Cancelled", description: `Booking ${booking.reference} has been cancelled.`, variant: "destructive" });
    navigate("/my-bookings");
  };

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2">
        <Link to="/my-bookings"><ArrowLeft className="w-4 h-4 mr-1" /> My Bookings</Link>
      </Button>

      {/* Status Banner */}
      <div className={`${banner.bg} rounded-2xl p-4 text-center`}>
        <Badge className={`${banner.bg} ${banner.text} border-0 text-sm font-bold mb-1`}>{booking.status.toUpperCase()}</Badge>
      </div>

      {/* Reference Card */}
      <Card className="card-shadow border-0">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Booking Reference</p>
            <p className="text-lg font-bold font-mono text-foreground">{booking.reference}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopy}><Copy className="w-4 h-4" /></Button>
        </CardContent>
      </Card>

      {/* Trip Details */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-3"><CardTitle className="text-base">Trip Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{booking.schedule.route.name}</p>
              <p className="text-muted-foreground">{booking.schedule.route.from} → {booking.schedule.route.to}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">{booking.schedule.departure} — {booking.schedule.arrival}</p>
              <p className="text-muted-foreground">{booking.schedule.date}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jeepney & Driver */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-3"><CardTitle className="text-base">Jeepney & Driver</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="flex items-center gap-3">
            <Bus className="w-4 h-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">{booking.schedule.jeepney.name}</p>
              <p className="text-muted-foreground">{booking.schedule.jeepney.plate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-primary" />
            <p className="font-medium text-foreground">{booking.schedule.jeepney.driver}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-3"><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-medium">{booking.seats}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Price / seat</span><span className="font-medium">₱45.00</span></div>
          {booking.paymentMethod && (
            <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" />Method</span><span className="font-medium capitalize">{booking.paymentMethod}</span></div>
          )}
          <div className="flex justify-between border-t border-border pt-2 mt-2"><span className="font-semibold">Total</span><span className="font-bold text-primary text-lg">₱{booking.total}.00</span></div>
        </CardContent>
      </Card>

      {/* Cancel */}
      {canCancel && (
        <Button variant="outline" onClick={() => setCancelOpen(true)} className="w-full rounded-2xl border-destructive text-destructive hover:bg-destructive/5">
          <XCircle className="w-4 h-4 mr-2" /> Cancel Booking
        </Button>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking?</DialogTitle>
            <DialogDescription>This action cannot be undone. Your booking {booking.reference} will be cancelled.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Keep Booking</Button></DialogClose>
            <Button variant="destructive" onClick={handleCancel}>Yes, Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingDetail;
