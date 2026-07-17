"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Auto‑dismiss after ms (default 4000). Set 0 to keep until manually dismissed. */
  duration?: number;
  /** Timestamp for the activity‑feed integration */
  timestamp?: Date;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

/* ─── Variant Config ───────────────────────────────────────────── */

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: ReactNode;
    borderColor: string;
    iconColor: string;
    bgAccent: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="size-4 shrink-0" />,
    borderColor: "border-emerald-400/20",
    iconColor: "text-emerald-400",
    bgAccent: "bg-emerald-400/5",
  },
  error: {
    icon: <AlertCircle className="size-4 shrink-0" />,
    borderColor: "border-[#c0392b]/20",
    iconColor: "text-[#c0392b]",
    bgAccent: "bg-[#c0392b]/5",
  },
  warning: {
    icon: <AlertTriangle className="size-4 shrink-0" />,
    borderColor: "border-yellow-400/20",
    iconColor: "text-yellow-400",
    bgAccent: "bg-yellow-400/5",
  },
  info: {
    icon: <Info className="size-4 shrink-0" />,
    borderColor: "border-blue-400/20",
    iconColor: "text-blue-400",
    bgAccent: "bg-blue-400/5",
  },
};

/* ─── Context ──────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

/* ─── Provider ─────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = { ...toast, id, timestamp: new Date() };
      setToasts((prev) => [...prev.slice(-9), newToast]); // keep max 10

      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
  }, []);

  const value = useMemo(
    () => ({ toasts, addToast, removeToast, clearAll }),
    [toasts, addToast, removeToast, clearAll]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

/* ─── Toast Container ──────────────────────────────────────────── */

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 w-full max-w-sm sm:max-w-md pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Individual Toast ─────────────────────────────────────────── */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const cfg = VARIANT_CONFIG[toast.variant];
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;

  // Animate the progress bar
  useEffect(() => {
    if (duration <= 0) return;
    setProgress(100);
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toast.id, duration]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95, transition: { duration: 0.25 } }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`pointer-events-auto rounded-xl bg-[#0a0a0a]/95 backdrop-blur-xl border ${cfg.borderColor} shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden ${cfg.bgAccent}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`${cfg.iconColor} mt-0.5`}>{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#f0eee9] leading-snug">
            {toast.title}
          </p>
          {toast.description && (
            <p className="text-xs text-[#9a9a9a] mt-1 leading-relaxed">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-xs font-medium text-[#c9a96e] hover:text-[#d4b879] transition-colors underline underline-offset-2 decoration-[#c9a96e]/30 hover:decoration-[#c9a96e]/60"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 p-1 rounded-md text-[#555] hover:text-[#9a9a9a] hover:bg-white/[0.04] transition-colors"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-[2px] bg-white/[0.04]">
          <motion.div
            className={`h-full ${cfg.iconColor.replace("text-", "bg-")}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Convenience helpers ──────────────────────────────────────── */

/** Shorthand: success toast */
export function toastSuccess(
  addToast: ToastContextValue["addToast"],
  title: string,
  description?: string
) {
  return addToast({ title, description, variant: "success" });
}

/** Shorthand: error toast */
export function toastError(
  addToast: ToastContextValue["addToast"],
  title: string,
  description?: string
) {
  return addToast({ title, description, variant: "error", duration: 6000 });
}

/** Shorthand: warning toast */
export function toastWarning(
  addToast: ToastContextValue["addToast"],
  title: string,
  description?: string
) {
  return addToast({ title, description, variant: "warning" });
}

/** Shorthand: info toast */
export function toastInfo(
  addToast: ToastContextValue["addToast"],
  title: string,
  description?: string
) {
  return addToast({ title, description, variant: "info" });
}

/** Toast for bulk operations — shows count + variant */
export function toastBulk(
  addToast: ToastContextValue["addToast"],
  variant: ToastVariant,
  action: string,
  count: number,
  failed = 0
) {
  const suffix = failed > 0 ? ` (${failed} failed)` : "";
  const desc =
    variant === "success"
      ? `${count} item${count !== 1 ? "s" : ""} processed successfully${suffix}`
      : `${count} item${count !== 1 ? "s" : ""}${suffix}`;

  return addToast({
    title: `${action} complete`,
    description: desc,
    variant: failed > 0 ? "warning" : variant,
    duration: 5000,
  });
}