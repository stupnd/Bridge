import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { supabase } from "../../supabaseClient";

/** Screenshot builds only (`vite build --mode capture`): never set in a production build. */
const CAPTURE = import.meta.env.VITE_CAPTURE === "1";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(!CAPTURE);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (CAPTURE) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setLoading(false);
    });
  }, []);

  if (loading) return null;
  if (!authed && !CAPTURE) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
