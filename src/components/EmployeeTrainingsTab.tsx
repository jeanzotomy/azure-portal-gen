import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

export default function EmployeeTrainingsTab(_props: { user: SupaUser }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/portal/formations", { replace: true });
  }, [navigate]);
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
