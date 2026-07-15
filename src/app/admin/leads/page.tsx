"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, Mail, AlertCircle, CheckCircle2, Reply, Trash2 } from "lucide-react";

/**
 * Focused leads inbox for AstroKalki admin.
 *
 * Single view that surfaces:
 *   - Newsletter subscribers (with drip stage, opt-out status, reply button)
 *   - Micro-readings (with pattern, frustration, email-sent status)
 *   - Abandoned flows (with step, partial data, recovery status)
 *
 * Each section has CSV export. The existing /admin page remains the home of
 * bookings/stats; this page is the new "lead inbox."
 */

type Tab = "newsletter" | "micro-readings" | "abandoned";

interface NewsletterRow {
  id: string;
  email: string;
  source: string | null;
  birthMonth: number | null;
  dripStage: number;
  lastDripAt: string | null;
  optedOut: boolean;
  createdAt: string;
}
interface MicroReadingRow {
  id: string;
  email: string;
  birthMonth: number;
  emotionalPattern: string;
  relationshipFrustration: string;
  resultHint: string;
  emailSentAt: string | null;
  createdAt: string;
}
interface AbandonedRow {
  id: string;
  email: string;
  flowType: string;
  step: number;
  parsed: Record<string, unknown>;
  recovered: boolean;
  recoveredAt: string | null;
  converted: boolean;
  createdAt: string;
}

const PATTERN_LABELS: Record<string, string> = {
  abandonment: "Abandonment Loop",
  control: "Control Architecture",
  "people-pleasing": "Chameleon Pattern",
  "emotional-numbness": "Deep Freeze",
  overthinking: "Mental Labyrinth",
  "self-doubt": "Erosion Pattern",
};

export default function LeadsAdmin() {
  const [tab, setTab] = useState<Tab>("newsletter");
  const [newsletter, setNewsletter] = useState<NewsletterRow[]>([]);
  const [readings, setReadings] = useState<MicroReadingRow[]>([]);
  const [abandoned, setAbandoned] = useState<AbandonedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "newsletter") {
        const r = await fetch("/api/admin/newsletter?limit=100").then((r) => r.json());
        setNewsletter(r.subscribers || []);
      } else if (tab === "micro-readings") {
        const r = await fetch("/api/admin/micro-readings?limit=100").then((r) => r.json());
        setReadings(r.readings || []);
      } else {
        const r = await fetch("/api/admin/abandoned-flows?limit=100").then((r) => r.json());
        setAbandoned(r.flows || []);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = (type: Tab) => {
    const url = `/api/admin/export?type=${type === "newsletter" ? "newsletter" : type === "micro-readings" ? "micro-readings" : "abandoned"}`;
    window.open(url, "_blank");
  };

  const sendReply = async (id: string) => {
    if (!replyMessage.trim()) return;
    setReplyingTo(null);
    await fetch(`/api/admin/newsletter/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyMessage }),
    });
    setReplyMessage("");
    alert("Reply sent.");
  };

  const removeSubscriber = async (id: string) => {
    if (!confirm("Opt this subscriber out? They'll stop receiving emails.")) return;
    await fetch(`/api/admin/newsletter/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0eee9] p-6 sm:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <a href="/admin" className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] block mb-2">
              ← Back to /admin
            </a>
            <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-[-0.02em]">
              Leads Inbox
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-2 font-light">
              Newsletter, micro-readings, and abandoned-flow recovery — in one place.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/[0.06]">
          {([
            { id: "newsletter", label: "Newsletter", icon: Mail, count: newsletter.length },
            { id: "micro-readings", label: "Micro-Readings", icon: CheckCircle2, count: readings.length },
            { id: "abandoned", label: "Abandoned Flows", icon: AlertCircle, count: abandoned.length },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-[11px] tracking-[0.25em] uppercase font-light transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                tab === t.id
                  ? "border-[#c9a96e] text-[#c9a96e]"
                  : "border-transparent text-[#7a7a7a] hover:text-[#f0eee9]"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
              <span className="ml-1 text-[10px] text-[#5a5a5a]">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => exportCsv(tab)}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#9a9a9a] border border-white/[0.08] px-3 py-1.5 hover:border-[#c9a96e]/50 hover:text-[#c9a96e] transition-colors"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>

        {/* Tables */}
        {tab === "newsletter" && (
          <div className="border border-white/[0.04] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] border-b border-white/[0.04]">
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Source</th>
                  <th className="px-4 py-3 font-normal">Birth Mo.</th>
                  <th className="px-4 py-3 font-normal">Drip</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Subscribed</th>
                  <th className="px-4 py-3 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {newsletter.map((n) => (
                  <tr key={n.id} className="border-b border-white/[0.04] hover:bg-white/[0.015]">
                    <td className="px-4 py-3 text-[#f0eee9] font-light">{n.email}</td>
                    <td className="px-4 py-3 text-[#9a9a9a] font-light">{n.source || "—"}</td>
                    <td className="px-4 py-3 text-[#9a9a9a] font-light">{n.birthMonth || "—"}</td>
                    <td className="px-4 py-3 text-[#9a9a9a] font-light">
                      {n.dripStage === 99 ? "—" : `Stage ${n.dripStage}`}
                    </td>
                    <td className="px-4 py-3">
                      {n.optedOut ? (
                        <span className="text-[10px] tracking-[0.2em] uppercase text-red-400/80">Opted out</span>
                      ) : (
                        <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-400/80">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5a5a5a] font-light text-xs">
                      {new Date(n.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <button
                        onClick={() => setReplyingTo(replyingTo === n.id ? null : n.id)}
                        disabled={n.optedOut}
                        className="text-[#c9a96e] hover:text-[#f0eee9] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Reply by email"
                      >
                        <Reply className="size-4" />
                      </button>
                      <button
                        onClick={() => removeSubscriber(n.id)}
                        className="text-red-400/60 hover:text-red-400"
                        title="Opt out"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {newsletter.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#5a5a5a] font-light">
                      No subscribers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Reply panel */}
            {replyingTo && (
              <div className="border-t border-white/[0.08] p-4 bg-[#0a0a0a]">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2">
                  Reply to {newsletter.find((n) => n.id === replyingTo)?.email}
                </p>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  placeholder="Type a personal note. This will be sent as a real email."
                  className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none resize-none font-light"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => sendReply(replyingTo)}
                    className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] hover:text-[#f0eee9]"
                  >
                    Send reply →
                  </button>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyMessage(""); }}
                    className="text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#f0eee9]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "micro-readings" && (
          <div className="border border-white/[0.04] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] border-b border-white/[0.04]">
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Pattern</th>
                  <th className="px-4 py-3 font-normal">Frustration</th>
                  <th className="px-4 py-3 font-normal">Birth Mo.</th>
                  <th className="px-4 py-3 font-normal">Email sent?</th>
                  <th className="px-4 py-3 font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.015]">
                    <td className="px-4 py-3 text-[#f0eee9] font-light">{r.email}</td>
                    <td className="px-4 py-3 text-[#c9a96e] font-light">
                      {PATTERN_LABELS[r.emotionalPattern] || r.emotionalPattern}
                    </td>
                    <td className="px-4 py-3 text-[#9a9a9a] font-light text-xs">{r.relationshipFrustration}</td>
                    <td className="px-4 py-3 text-[#9a9a9a] font-light">{r.birthMonth}</td>
                    <td className="px-4 py-3">
                      {r.emailSentAt ? (
                        <CheckCircle2 className="size-4 text-emerald-400/70" />
                      ) : (
                        <AlertCircle className="size-4 text-yellow-400/60" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5a5a5a] font-light text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {readings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#5a5a5a] font-light">
                      No micro-readings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "abandoned" && (
          <div className="border border-white/[0.04] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] border-b border-white/[0.04]">
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Step</th>
                  <th className="px-4 py-3 font-normal">Pattern selected</th>
                  <th className="px-4 py-3 font-normal">Recovery</th>
                  <th className="px-4 py-3 font-normal">Converted</th>
                  <th className="px-4 py-3 font-normal">Started</th>
                </tr>
              </thead>
              <tbody>
                {abandoned.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.015]">
                    <td className="px-4 py-3 text-[#f0eee9] font-light">{a.email}</td>
                    <td className="px-4 py-3 text-[#9a9a9a] font-light">{a.step}/4</td>
                    <td className="px-4 py-3 text-[#c9a96e] font-light">
                      {(a.parsed?.patterns as string[])?.[0]
                        ? PATTERN_LABELS[(a.parsed.patterns as string[])[0]] || (a.parsed.patterns as string[])[0]
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.recovered ? (
                        <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-400/80">Sent</span>
                      ) : (
                        <span className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/70">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.converted ? (
                        <CheckCircle2 className="size-4 text-emerald-400/70" />
                      ) : (
                        <span className="text-[#3a3a3a]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5a5a5a] font-light text-xs">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {abandoned.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#5a5a5a] font-light">
                      No abandoned flows tracked yet. Visit the homepage and start a micro-reading without finishing it to test.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
