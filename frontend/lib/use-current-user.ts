"use client";

import { useEffect, useState } from "react";
import { readResponseBodyJson } from "@/lib/api";

export type CurrentUser = {
  id: number;
  email: string;
  is_admin: boolean;
  email_verified: boolean;
};

type State = {
  user: CurrentUser | null;
  loading: boolean;
};

export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ user: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/bff/v1/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!r.ok) {
          setState({ user: null, loading: false });
          return;
        }
        const data = await readResponseBodyJson<CurrentUser>(r);
        setState({ user: data ?? null, loading: false });
      } catch {
        if (!cancelled) setState({ user: null, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
