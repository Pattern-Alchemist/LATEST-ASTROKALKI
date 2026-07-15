"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Clock, User } from "lucide-react";

/**
 * ReferralRow — a single referral row in the admin table.
 *
 * Expandable: clicking the row reveals the ReferralUse history
 * (each individual email that used this code, with timestamp).
 */

export interface ReferralUseRow {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface ReferralRowData {
  id: string;
  code: string;
  referrerName: string;
  referrerEmail: string;
  uses: number;
  lastUsedAt: string | null;
  createdAt: string;
  referralUses: ReferralUseRow[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReferralRow({ row }: { row: ReferralRowData }) {
  const [open, setOpen] = useState(false);

  const hasUses = row.referralUses.length > 0;

  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="border-b border-white/[0.04] hover:bg-white/[0.015] cursor-pointer transition-colors"
      >
        <td className="px-4 py-4">
          <span className="inline-flex items-center text-[#5a5a5a]">
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </span>
        </td>
        <td className="px-4 py-4">
          <code className="font-mono text-base text-[#c9a96e] tracking-[0.1em] font-light">
            {row.code}
          </code>
        </td>
        <td className="px-4 py-3 text-[#f0eee9] font-light">{row.referrerName}</td>
        <td className="px-4 py-3 text-[#9a9a9a] font-light text-xs">
          {row.referrerEmail}
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-base text-[#f0eee9] font-light">
            {row.uses}
          </span>
          <span className="ml-2 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
            {row.referralUses.length} tracked
          </span>
        </td>
        <td className="px-4 py-3 text-[#9a9a9a] font-light text-xs">
          {formatDate(row.lastUsedAt)}
        </td>
        <td className="px-4 py-3 text-[#5a5a5a] font-light text-xs">
          {formatDate(row.createdAt)}
        </td>
      </tr>

      {open && (
        <tr className="bg-[#080808]">
          <td colSpan={7} className="px-4 py-6">
            <div className="pl-6 border-l border-[#c9a96e]/20">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-4 font-light">
                Referral use history
              </p>
              {hasUses ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {row.referralUses.map((use) => (
                    <div
                      key={use.id}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 py-2 border-b border-white/[0.02] last:border-b-0"
                    >
                      <div className="flex items-center gap-2 text-[#f0eee9] font-light text-sm">
                        <Mail className="size-3 text-[#5a5a5a]" />
                        {use.email}
                      </div>
                      <div className="flex items-center gap-2 text-[#9a9a9a] font-light text-xs">
                        <User className="size-3 text-[#5a5a5a]" />
                        {use.name || "—"}
                      </div>
                      <div className="flex items-center gap-2 text-[#5a5a5a] font-light text-xs">
                        <Clock className="size-3" />
                        {formatDate(use.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#5a5a5a] font-light leading-relaxed">
                  No tracked uses yet. The <span className="text-[#9a9a9a]">uses</span>{" "}
                  counter may be ahead of this list — it&apos;s incremented by
                  the booking flow&apos;s &ldquo;referred by&rdquo; field as
                  well, which doesn&apos;t always create a ReferralUse row.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
