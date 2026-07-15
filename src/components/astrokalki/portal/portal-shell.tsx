"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  StickyNote,
  CreditCard,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

export type PortalTab = "overview" | "sessions" | "notes" | "billing";

interface PortalShellProps {
  children: (activeTab: PortalTab) => React.ReactNode;
  email: string;
  initialTab?: PortalTab;
}

// ─── Tab config ───────────────────────────────────────────────────

const TABS: { id: PortalTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="size-4" /> },
  { id: "sessions", label: "Sessions", icon: <Calendar className="size-4" /> },
  { id: "notes", label: "Notes", icon: <StickyNote className="size-4" /> },
  { id: "billing", label: "Billing", icon: <CreditCard className="size-4" /> },
];

// ─── Component ────────────────────────────────────────────────────

export default function PortalShell({
  children,
  email,
  initialTab = "overview",
}: PortalShellProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>(initialTab);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e8e6e1]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-editorial text-sm tracking-[0.12em] text-[#f0eee9]">
                YOUR PORTAL
              </h1>
              <p className="text-body-cinematic text-[10px] text-[#9a9a9a] truncate max-w-48">
                {email}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#c9a96e]/10 text-[#c9a96e]"
                    : "text-[#9a9a9a] hover:text-[#f0eee9] hover:bg-white/[0.02]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children(activeTab)}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────

export function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="size-6 text-[#c9a96e] animate-spin" />
    </div>
  );
}

// ─── Access gate ──────────────────────────────────────────────────

export function PortalAccessGate({
  children,
  hasAccess,
  onRequestAccess,
}: {
  children: React.ReactNode;
  hasAccess: boolean;
  onRequestAccess?: () => void;
}) {
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h2 className="text-editorial text-xl text-[#f0eee9] mb-4">
            Portal Access
          </h2>
          <p className="text-body-cinematic text-sm text-[#9a9a9a] mb-6">
            Enter your email to access your portal, or check your inbox for a
            secure link.
          </p>
          {onRequestAccess && (
            <button
              onClick={onRequestAccess}
              className="px-6 py-3 bg-[#c9a96e] text-[#070707] rounded-lg text-sm font-medium hover:bg-[#d4b57a] transition-colors"
            >
              Request Access
            </button>
          )}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
