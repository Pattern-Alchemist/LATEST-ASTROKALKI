"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  Calendar,
  ExternalLink,
  Package,
} from "lucide-react";

interface PortalBundleCardProps {
  bundles: Array<{
    id: string;
    totalSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
    bundleProduct: { slug: string; title: string };
  }>;
  stripeCustomerId: string | null;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function PortalBundleCard({
  bundles,
  stripeCustomerId,
}: PortalBundleCardProps) {
  const handleOpenBilling = async () => {
    if (!stripeCustomerId) return;
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeCustomerId }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Failed to open billing portal:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Active Bundles */}
      {bundles.length > 0 ? (
        <div>
          <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
            Your Bundles
          </h3>
          <div className="space-y-3">
            {bundles.map((bundle, i) => (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="size-4 text-[#c9a96e]" />
                      <p className="text-editorial text-sm text-[#f0eee9]">
                        {bundle.bundleProduct.title}
                      </p>
                    </div>
                    <p className="text-body-cinematic text-xs text-[#9a9a9a]">
                      {bundle.totalSessions} sessions total
                      {bundle.expiresAt && (
                        <> · Expires {formatDate(bundle.expiresAt)}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-editorial text-2xl text-[#c9a96e]">
                      {bundle.remainingSessions}
                    </p>
                    <p className="text-body-cinematic text-[10px] text-[#9a9a9a]">
                      remaining
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c9a96e] to-[#a8884d] rounded-full transition-all duration-500"
                    style={{
                      width: `${((bundle.totalSessions - bundle.remainingSessions) / bundle.totalSessions) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-body-cinematic text-[10px] text-[#555] mt-2">
                  {bundle.totalSessions - bundle.remainingSessions} of{" "}
                  {bundle.totalSessions} sessions used
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="size-10 text-[#333] mx-auto mb-3" />
          <p className="text-body-cinematic text-sm text-[#9a9a9a]">
            No active bundles. Purchase a session pack to continue your journey.
          </p>
        </div>
      )}

      {/* Billing Section */}
      {stripeCustomerId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="size-4 text-[#c9a96e]" />
                <p className="text-editorial text-sm text-[#f0eee9]">
                  Billing & Payments
                </p>
              </div>
              <p className="text-body-cinematic text-xs text-[#9a9a9a]">
                Manage invoices, payment methods, and receipts
              </p>
            </div>
            <button
              onClick={handleOpenBilling}
              className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e]/10 text-[#c9a96e] rounded-lg text-xs font-medium hover:bg-[#c9a96e]/20 transition-colors"
            >
              <ExternalLink className="size-3" />
              Manage Billing
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
