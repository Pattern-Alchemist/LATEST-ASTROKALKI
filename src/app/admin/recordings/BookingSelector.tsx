"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronsUpDown, Link2, Loader2, Search, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * BookingSelector — searchable combobox for attaching a RecordedReading to
 * an existing Booking.
 *
 * Fetches /api/admin/bookings?search=<q>&limit=20 with a 200ms debounce.
 * Renders name + email + scheduled/created date for each result. The
 * selected booking is shown as a chip with a detach (X) button.
 *
 * shadcn Command + Popover primitives, themed to match the dark editorial
 * AstroKalki admin design system (#050505 bg, #c9a96e gold, monospace
 * metadata).
 *
 * Controlled component — caller owns the value:
 *   <BookingSelector
 *     value={booking}
 *     onChange={setBooking}
 *     disabled={uploading}
 *   />
 */

export interface BookingPick {
  id: string;
  name: string;
  email: string;
  duration: number;
  price: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

interface Props {
  value: BookingPick | null;
  onChange: (booking: BookingPick | null) => void;
  disabled?: boolean;
  /** Optional label above the selector. */
  label?: string;
  /** Compact layout — used inside table-row edit forms. */
  compact?: boolean;
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function BookingSelector({
  value,
  onChange,
  disabled = false,
  label,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BookingPick[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>("");

  // ─── Debounced server search ────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/bookings?search=${encodeURIComponent(q)}&limit=20`
      );
      const data = await res.json();
      setResults(Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Avoid re-firing for the same query (e.g. after a re-render).
    if (search === lastQueryRef.current) return;
    lastQueryRef.current = search;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(search);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, runSearch]);

  // Initial fetch when the popover first opens (so the admin sees results
  // before typing anything).
  useEffect(() => {
    if (open && results.length === 0 && !loading && search === "") {
      runSearch("");
    }
  }, [open, results.length, loading, search, runSearch]);

  // ─── Selected chip ──────────────────────────────────────────────────
  if (value) {
    return (
      <div>
        {label && (
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1.5 block font-light">
            {label}
          </label>
        )}
        <div
          className={`flex items-center gap-2.5 border border-[#c9a96e]/30 bg-[#c9a96e]/[0.04] ${
            compact ? "p-2" : "p-2.5"
          }`}
        >
          <Link2 className="size-3.5 text-[#c9a96e] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#f0eee9] font-light truncate">
              {value.name}
            </p>
            <p className="text-[11px] text-[#7a7a7a] font-mono truncate">
              {value.email} · {value.duration} min · {value.price}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-[#5a5a5a] hover:text-red-400 transition-colors p-1 disabled:opacity-30"
            aria-label="Detach booking"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Combobox (no selection) ────────────────────────────────────────
  return (
    <div>
      {label && (
        <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1.5 block font-light">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="w-full flex items-center gap-2 border-b border-white/[0.08] focus:border-[#c9a96e]/60 outline-none py-2 text-left text-sm text-[#7a7a7a] hover:text-[#f0eee9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="size-4 text-[#5a5a5a]" />
            <span className="flex-1 font-light">
              Search by name or email…
            </span>
            <ChevronsUpDown className="size-3.5 text-[#5a5a5a] shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] bg-[#0a0a0a] border-white/[0.08] p-0 shadow-2xl"
        >
          <Command shouldFilter={false} className="bg-transparent">
            <CommandInput
              placeholder="Type a name or email…"
              value={search}
              onValueChange={setSearch}
              className="text-sm text-[#f0eee9] font-light"
            />
            <CommandList className="max-h-72 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-6 gap-2 text-[#7a7a7a] text-xs">
                  <Loader2 className="size-3.5 text-[#c9a96e] animate-spin" />
                  Searching…
                </div>
              )}
              {!loading && results.length === 0 && (
                <CommandEmpty>
                  {search.trim()
                    ? `No bookings match "${search}"`
                    : "Type to search existing bookings"}
                </CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup
                  heading="Recent bookings"
                  className="text-[#5a5a5a] [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.25em] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:font-light"
                >
                  {results.map((b) => (
                    <CommandItem
                      key={b.id}
                      value={b.id}
                      onSelect={() => {
                        onChange(b);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="!py-2.5 hover:!bg-[#c9a96e]/5 data-[selected=true]:!bg-[#c9a96e]/5 !text-[#f0eee9] !justify-start gap-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#f0eee9] font-light truncate">
                          {b.name}
                        </p>
                        <p className="text-[11px] text-[#7a7a7a] font-mono truncate">
                          {b.email}
                        </p>
                        <p className="text-[10px] text-[#5a5a5a] font-mono mt-0.5">
                          {formatDateShort(b.scheduledAt) !== "—"
                            ? `Scheduled ${formatDateShort(b.scheduledAt)}`
                            : `Booked ${formatDateShort(b.createdAt)}`}{" "}
                          · {b.duration} min · {b.price} · {b.status}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
