"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CreditCard,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface PortalOverviewProps {
  email: string;
  summary: {
    totalBookings: number;
    completedBookings: number;
    activeBundles: number;
  };
  recentBookings: Array<{
    id: string;
    name: string;
    duration: number;
    price: string;
    status: string;
    scheduledAt: string | null;
    roomUrl: string | null;
    createdAt: string;
  }>;
  activeBundles: Array<{
    id: string;
    totalSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
    bundleProduct: { slug: string; title: string };
  }>;
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

export default function PortalOverview({
  email,
  summary,
  recentBookings,
  activeBundles,
}: PortalOverviewProps) {
  const name = email.split("@")[0];
  const nextSession = recentBookings.find(
    (b) => b.status === "confirmed" && b.scheduledAt
  );

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-editorial text-2xl text-[#f0eee9] mb-2">
          Welcome back, {name}
        </h2>
        <p className="text-body-cinematic text-sm text-[#9a9a9a]">
          Your pattern journey continues here.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sessions", value: summary.totalBookings, icon: Calendar },
          { label: "Completed", value: summary.completedBookings, icon: Sparkles },
          { label: "Active Bundles", value: summary.activeBundles, icon: CreditCard },
          { label: "Next Session", value: nextSession ? formatDate(nextSession.scheduledAt!) : "None", icon: Clock },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-4"
          >
            <stat.icon className="size-4 text-[#c9a96e] mb-2" />
            <p className="text-editorial text-lg text-[#f0eee9]">
              {stat.value}
            </p>
            <p className="text-body-cinematic text-[10px] text-[#9a9a9a] mt-1">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Next Session Card */}
      {nextSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-[#0a0a0a] border border-[#c9a96e]/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-cinematic text-[10px] uppercase tracking-[0.2em] text-[#c9a96e] mb-2">
                Next Session
              </p>
              <p className="text-editorial text-lg text-[#f0eee9]">
                {formatDate(nextSession.scheduledAt!)}
              </p>
              <p className="text-body-cinematic text-xs text-[#9a9a9a] mt-1">
                {nextSession.duration} minutes · {nextSession.price}
              </p>
            </div>
            {nextSession.roomUrl && (
              <a
                href={nextSession.roomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#070707] rounded-lg text-xs font-medium hover:bg-[#d4b57a] transition-colors"
              >
                Join Session
                <ArrowRight className="size-3" />
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* Active Bundles */}
      {activeBundles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
            Active Bundles
          </h3>
          <div className="space-y-3">
            {activeBundles.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-[#111]/50 border border-white/[0.04] rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-[#f0eee9] text-sm font-medium">
                    {bundle.bundleProduct.title}
                  </p>
                  <p className="text-body-cinematic text-xs text-[#9a9a9a] mt-1">
                    {bundle.remainingSessions} of {bundle.totalSessions} sessions remaining
                    {bundle.expiresAt && (
                      <> · Expires {formatDate(bundle.expiresAt)}</>
                    )}
                  </p>
                </div>
                <div className="text-[#c9a96e] text-lg font-bold">
                  {bundle.remainingSessions}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
