import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { supabase } from "../../supabaseClient";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setLoading(false);
    });
  }, []);

  if (loading) return null;
  if (!authed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
