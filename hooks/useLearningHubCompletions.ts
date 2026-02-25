"use client";
import * as React from "react";

export type LHCompletion = {
  email: string;
  module_id: string;
  completed_at?: string;
  source?: string;
};

export function useLearningHubCompletions(email: string) {
  const normalizedEmail = (email || "").trim().toLowerCase();

  const [completions, setCompletions] = React.useState<LHCompletion[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!normalizedEmail) {
      setCompletions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/lh/completions?email=${encodeURIComponent(normalizedEmail)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setCompletions(data.completions || []);
    } catch (err) {
      console.error("Failed to load completions:", err);
    } finally {
      setLoading(false);
    }
  }, [normalizedEmail]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { completions, loading, refresh };
}
