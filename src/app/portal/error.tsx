"use client";

/**
 * /portal error boundary — catches client-side rendering errors
 */

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Portal] Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center max-w-md px-6 space-y-4">
        <AlertTriangle className="size-8 text-[#c9a96e] mx-auto" />
        <h2 className="text-editorial text-lg text-[#f0eee9]">
          Something went wrong
        </h2>
        <p className="text-body-cinematic text-sm text-[#9a9a9a]">
          We couldn&apos;t load your portal. Please try again or contact
          support if the issue persists.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#c9a96e] text-[#070707] rounded-lg text-xs font-medium hover:bg-[#d4b57a] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
