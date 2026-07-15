"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Sign-out button for the /account page.
 *
 * POSTs to /api/auth/signout with the NextAuth CSRF token, then refreshes
 * the page so the server component re-renders as the signed-out state.
 */
export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken || null))
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    if (loading || !csrfToken) return;
    setLoading(true);
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl: "/account",
        }).toString(),
      });
      // Force a full re-render of the server component so the page flips
      // back to the sign-in view.
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading || !csrfToken}
      className="inline-flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] border-b border-white/[0.08] pb-1.5 hover:border-[#c9a96e]/40 hover:text-[#9a9a9a] transition-colors disabled:opacity-50 cursor-pointer"
    >
      {loading ? "Signing out…" : "Sign out"}
      {!loading && <span>→</span>}
    </button>
  );
}
