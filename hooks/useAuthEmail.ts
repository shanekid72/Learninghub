"use client";
import * as React from "react";

export function useAuthEmail() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        setEmail((data.email || "").trim().toLowerCase());
      } catch {
        setEmail("");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { email, loading };
}
