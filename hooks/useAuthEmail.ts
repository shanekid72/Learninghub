"use client";
import * as React from "react";

type AuthUser = {
  id: string
  email: string
  role: string
  fullName: string | null
  team: string | null
}

export function useAuthEmail() {
  const [email, setEmail] = React.useState("");
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data: { email?: string; user?: AuthUser } = await res.json();
        setEmail((data.email || "").trim().toLowerCase());
        setUser(data.user || null)
      } catch {
        setEmail("");
        setUser(null)
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { email, user, loading };
}
