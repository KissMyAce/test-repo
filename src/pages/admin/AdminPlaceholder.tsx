import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const AdminPlaceholder = () => {
  const location = useLocation();
  const pageName = location.pathname.split("/").pop() || "Page";

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <Card className="card-shadow border-0">
        <CardContent className="py-16 text-center space-y-3">
          <Construction className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground capitalize">{pageName}</h2>
          <p className="text-sm text-muted-foreground">This page is under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPlaceholder;
