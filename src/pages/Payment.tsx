import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CreditCard, Smartphone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const paymentMethods = [
  { id: "gcash", name: "GCash", icon: Smartphone, color: "hsl(217 72% 56%)" },
  { id: "maya", name: "Maya", icon: CreditCard, color: "hsl(152 60% 42%)" },
];

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const seats = parseInt(searchParams.get("seats") || "1");
  const total = seats * 45;
  const route = searchParams.get("route") || "SM City → Ayala Terminal";

  const handleProceed = () => {
    if (!selected) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Simulate 90% success
      const success = Math.random() > 0.1;
      if (success) {
        toast({ title: "Payment Successful", description: `₱${total}.00 paid via ${selected === "gcash" ? "GCash" : "Maya"}` });
        navigate(`/payment/status?result=success&method=${selected}&total=${total}&route=${encodeURIComponent(route)}&seats=${seats}`);
      } else {
        navigate(`/payment/status?result=failure&method=${selected}&total=${total}&route=${encodeURIComponent(route)}&seats=${seats}`);
      }
    }, 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-foreground">Payment</h1>

      {/* Booking Summary */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium">{route}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-medium">{seats}</span></div>
          <div className="flex justify-between border-t border-border pt-2 mt-2"><span className="font-semibold">Total</span><span className="font-bold text-primary text-lg">₱{total}.00</span></div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Select Payment Method</h2>
        <div className="grid gap-3">
          {paymentMethods.map((method) => {
            const isSelected = selected === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelected(method.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-primary bg-secondary card-shadow"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <method.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{method.name}</p>
                  <p className="text-xs text-muted-foreground">Pay securely with {method.name}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary" : "border-muted-foreground/30"}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleProceed}
        disabled={!selected || loading}
        className="w-full h-12 rounded-2xl text-base font-semibold"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ₱${total}.00`}
      </Button>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
          <Card className="p-8 text-center card-shadow-lg border-0">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="font-semibold text-foreground">Processing Payment...</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait</p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Payment;
