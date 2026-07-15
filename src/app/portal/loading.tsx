/**
 * /portal loading state — shown during server component suspense
 */

import { Loader2 } from "lucide-react";

export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="size-6 text-[#c9a96e] animate-spin mx-auto" />
        <p className="text-body-cinematic text-xs text-[#9a9a9a] tracking-wider uppercase">
          Loading your portal…
        </p>
      </div>
    </div>
  );
}
