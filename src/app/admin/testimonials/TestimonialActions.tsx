"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Star, Trash2, Loader2 } from "lucide-react";

/**
 * Admin-only action buttons for a single testimonial row.
 *
 * Approve / Reject / Feature-Unfeature / Delete. Each action PATCHes (or
 * DELETEs) the admin API and asks the parent to refresh the data via the
 * `onChanged` callback. Buttons are intentionally text-link-styled with
 * gold underlines — no boxed buttons — to match the editorial admin voice
 * established in /admin/leads.
 *
 * `currentStatus` controls which actions are visible: when already approved,
 * "Approve" is hidden; when already rejected, "Reject" is hidden; etc.
 */

interface Props {
  id: string;
  currentStatus: "pending" | "approved" | "rejected";
  featured: boolean;
  /** Optional callback after a successful mutation. Always followed by router.refresh(). */
  onChanged?: () => void;
}

export default function TestimonialActions({
  id,
  currentStatus,
  featured,
  onChanged,
}: Props) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const refresh = () => {
    // Re-run the server component so the active tab's query reflects the
    // new state (approved items leave the pending queue, etc.)
    router.refresh();
    onChanged?.();
  };

  const patch = async (body: Record<string, unknown>, actionLabel: string) => {
    setBusyAction(actionLabel);
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Action failed");
        return;
      }
      refresh();
    } catch {
      alert("Network error — please retry");
    } finally {
      setBusyAction(null);
    }
  };

  const remove = async () => {
    if (!confirm("Permanently delete this testimonial? This cannot be undone.")) {
      return;
    }
    setBusyAction("delete");
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Delete failed");
        return;
      }
      refresh();
    } catch {
      alert("Network error — please retry");
    } finally {
      setBusyAction(null);
    }
  };

  // Visual helper — link-style button with gold underline
  const LinkBtn = ({
    onClick,
    disabled,
    label,
    tone = "gold",
    icon,
  }: {
    onClick: () => void;
    disabled: boolean;
    label: string;
    tone?: "gold" | "muted" | "danger";
    icon: React.ReactNode;
  }) => {
    const color =
      tone === "gold"
        ? "text-[#c9a96e] hover:text-[#f0eee9]"
        : tone === "danger"
          ? "text-red-400/70 hover:text-red-400"
          : "text-[#7a7a7a] hover:text-[#f0eee9]";
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase font-light transition-colors duration-300 border-b border-transparent hover:border-current pb-0.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-transparent ${color}`}
      >
        {icon}
        {label}
      </button>
    );
  };

  const disabled = busyAction !== null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {currentStatus !== "approved" && (
        <LinkBtn
          onClick={() => patch({ status: "approved" }, "approve")}
          disabled={disabled}
          label="Approve"
          icon={
            busyAction === "approve" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )
          }
        />
      )}

      {currentStatus !== "rejected" && (
        <LinkBtn
          onClick={() => patch({ status: "rejected" }, "reject")}
          disabled={disabled}
          label="Reject"
          tone="muted"
          icon={
            busyAction === "reject" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <X className="size-3" />
            )
          }
        />
      )}

      <LinkBtn
        onClick={() => patch({ featured: !featured }, "feature")}
        disabled={disabled}
        label={featured ? "Unfeature" : "Feature"}
        tone={featured ? "gold" : "muted"}
        icon={
          busyAction === "feature" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Star className={`size-3 ${featured ? "fill-[#c9a96e]" : ""}`} />
          )
        }
      />

      <LinkBtn
        onClick={remove}
        disabled={disabled}
        label="Delete"
        tone="danger"
        icon={
          busyAction === "delete" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Trash2 className="size-3" />
          )
        }
      />
    </div>
  );
}
