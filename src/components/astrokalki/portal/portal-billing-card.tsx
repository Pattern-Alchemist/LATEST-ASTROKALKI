"use client";

/**
 * PortalBillingCard — opens Stripe-hosted billing portal.
 * Billing management (invoices, payment methods, receipts) is handled
 * entirely by Stripe. This card provides the bridge.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  Shield,
} from "lucide-react";

interface PortalBillingCardProps {
  stripeCustomerId: string | null;
}

export default function PortalBillingCard({
  stripeCustomerId,
}: PortalBillingCardProps) {
  const [loading, setLoading] = useState(false);

  const handleOpenBilling = async () => {
    if (!stripeCustomerId) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  if (!stripeCustomerId) {
    return (
      <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="size-4 text-[#555]" />
          <p className="text-editorial text-sm text-[#9a9a9a]">
            Billing & Payments
          </p>
        </div>
        <p className="text-body-cinematic text-xs text-[#555]">
          Billing information will appear here after your first purchase.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-[#c9a96e]" />
          <p className="text-editorial text-sm text-[#f0eee9]">
            Billing & Payments
          </p>
        </div>
        <button
          onClick={handleOpenBilling}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e]/10 text-[#c9a96e] rounded-lg text-xs font-medium hover:bg-[#c9a96e]/20 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ExternalLink className="size-3" />
          )}
          {loading ? "Opening…" : "Manage Billing"}
        </button>
      </div>

      <p className="text-body-cinematic text-xs text-[#9a9a9a]">
        Manage invoices, payment methods, and receipts in your secure Stripe portal.
      </p>

      <div className="flex items-center gap-4 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-[10px] text-[#555]">
          <Receipt className="size-3" />
          <span>Invoices</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#555]">
          <CreditCard className="size-3" />
          <span>Payment Methods</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#555]">
          <Shield className="size-3" />
          <span>Secure</span>
        </div>
      </div>
    </motion.div>
  );
}
