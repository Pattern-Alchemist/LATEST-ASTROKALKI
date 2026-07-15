"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { openWhatsApp } from "@/lib/whatsapp";
import { useI18n } from "@/lib/i18n-context";
import { AvailabilityIndicator } from "@/components/astrokalki/availability-indicator";
import StripePaymentWrapper from "@/components/astrokalki/stripe-payment-element";
import VideoCallRoom from "@/components/astrokalki/video-call-room";

const durationKeys = [
  { value: "30", labelKey: "booking.duration30", sublabelKey: "booking.duration30sub", price: "₹1,499" },
  { value: "60", labelKey: "booking.duration60", sublabelKey: "booking.duration60sub", price: "₹1,999", recommended: true },
  { value: "90", labelKey: "booking.duration90", sublabelKey: "booking.duration90sub", price: "₹2,999" },
];

const contextKeys = [
  "booking.ctx1", "booking.ctx2", "booking.ctx3", "booking.ctx4",
  "booking.ctx5", "booking.ctx6", "booking.ctx7", "booking.ctx8",
];

// ─── Slot types ──────────────────────────────────────────────────

interface Slot {
  id: string;
  start: string; // ISO
  end: string;   // ISO
  duration: number;
  status: string;
}

const STEPS = [
  { id: 1, labelKey: "booking.step.duration" },
  { id: 2, labelKey: "booking.step.slot" },
  { id: 3, labelKey: "booking.step.context" },
  { id: 4, labelKey: "booking.step.details" },
  { id: 5, labelKey: "booking.step.confirm" },
];

// ─── Availability status — simple logic ───────────────────────────
type AvailabilityTier = "open" | "limited" | "waitlist";

const AVAILABILITY_STYLES: Record<AvailabilityTier, { dot: string; label: string; bg: string; text: string }> = {
  open: {
    dot: "bg-[#4ade80]",
    label: "Open for bookings",
    bg: "bg-[#4ade80]/10",
    text: "text-[#4ade80]",
  },
  limited: {
    dot: "bg-[#fbbf24]",
    label: "Limited availability",
    bg: "bg-[#fbbf24]/10",
    text: "text-[#fbbf24]",
  },
  waitlist: {
    dot: "bg-[#f87171]",
    label: "Waitlist only",
    bg: "bg-[#f87171]/10",
    text: "text-[#f87171]",
  },
};

function getAvailabilityTier(): AvailabilityTier {
  return "open";
}

// ─── Date / time formatting helpers ──────────────────────────────

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Kolkata",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata",
  });
}

function dateGroupKey(iso: string): string {
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 330 * 60_000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
}

// ─── Component ───────────────────────────────────────────────────

export default function Booking() {
  const [step, setStep] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [skippedSlot, setSkippedSlot] = useState(false);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", birthDate: "", birthTime: "", birthPlace: "", message: "",
    referredBy: "",
  });
  const { t } = useI18n();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsFetchedFor, setSlotsFetchedFor] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // ─── Stripe payment state ──────────────────────────────────────
  // Only show Stripe option if publishable key is configured
  const stripeAvailable = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "whatsapp" | null>(stripeAvailable ? null : "whatsapp");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  // Availability tier
  const [availabilityTier] = useState<AvailabilityTier>(getAvailabilityTier());
  const avStyle = AVAILABILITY_STYLES[availabilityTier];

  // Referral pre-fill on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rawRef = params.get("ref");
    if (!rawRef) return;
    const code = rawRef.trim().toUpperCase().slice(0, 32);
    if (!code) return;
    setFormData((prev) => (prev.referredBy === code ? prev : { ...prev, referredBy: code }));
  }, []);

  // Stripe redirect return detection — handles UPI/netbanking/wallet payments
  // that redirect the user to an external page and return via the return_url.
  // On return, Stripe appends ?payment_intent=pi_xxx&redirect_status=succeeded
  // to the URL. If we detect a successful return, confirm the booking.
  // The full booking payload is retrieved from sessionStorage (stored before
  // initiating the redirect).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pi = params.get("payment_intent");
    const status = params.get("redirect_status");
    if (!pi || status !== "succeeded") return;

    // Retrieve the stored booking payload
    const storedPayload = sessionStorage.getItem("stripe_booking_payload");
    let bookingPayload: Record<string, unknown> = { paymentIntentId: pi };
    if (storedPayload) {
      try {
        const parsed = JSON.parse(storedPayload);
        bookingPayload = { ...parsed, paymentIntentId: pi };
        sessionStorage.removeItem("stripe_booking_payload");
      } catch { /* use default */ }
    }

    // Payment was completed via redirect — confirm the booking
    const confirmReturnBooking = async () => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/stripe/confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayload),
        });
        const data = await res.json();
        if (res.ok && data.booking?.roomUrl) {
          setMeetingLink(data.booking.roomUrl);
        }
        if (!res.ok) {
          console.warn("[Stripe] Return booking confirmation failed — payment already taken");
        }
        setBookingSuccess(true);
        setPaymentConfirmed(true);
        // Clean URL params
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      } catch {
        // Payment already taken — log and show success
        setBookingSuccess(true);
        setPaymentConfirmed(true);
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      } finally {
        setSubmitting(false);
      }
    };

    confirmReturnBooking();
  }, []);

  const toggleContext = (ctx: string) => {
    setSelectedContexts((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx]
    );
  };

  const fetchSlots = useCallback(async (duration: string) => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const res = await fetch(`/api/slots?duration=${duration}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setSlots(data.slots || []);
      setSlotsFetchedFor(duration);
    } catch {
      setSlotsError(t("booking.slotRetry"));
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (step === 2 && selectedDuration && slotsFetchedFor !== selectedDuration) {
      fetchSlots(selectedDuration);
    }
  }, [step, selectedDuration, slotsFetchedFor, fetchSlots]);

  const handleNext = () => { if (step < 5) setStep(step + 1); };
  const handleBack = () => { if (step > 0) setStep(step - 1); };

  const canProceed = () => {
    if (step === 1) return selectedDuration !== null;
    if (step === 2) return selectedSlot !== null || skippedSlot;
    if (step === 3) return selectedContexts.length > 0;
    if (step === 4) return formData.name && formData.email;
    return true;
  };

  const getPrice = () => {
    if (selectedDuration === "30") return "₹1,499";
    if (selectedDuration === "60") return "₹1,999";
    if (selectedDuration === "90") return "₹2,999";
    return "";
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    setSkippedSlot(false);
  };

  const handleSkipSlot = () => {
    setSelectedSlot(null);
    setSkippedSlot(true);
  };

  // ─── Create PaymentIntent for Stripe ───────────────────────────
  const handleInitiateStripePayment = async () => {
    setBookingError(null);
    setPaymentProcessing(true);

    // Store booking payload in sessionStorage so redirect-based payments
    // (UPI/netbanking) can retrieve it when returning from the external page
    const bookingPayload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      duration: selectedDuration,
      price: getPrice(),
      contexts: selectedContexts,
      message: formData.message || undefined,
      referredBy: formData.referredBy || undefined,
      selectedSlot: selectedSlot || undefined,
    };
    try {
      sessionStorage.setItem("stripe_booking_payload", JSON.stringify(bookingPayload));
    } catch { /* non-fatal */ }

    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: selectedDuration,
          price: getPrice(),
          email: formData.email,
          name: formData.name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setBookingError(data.error || "Could not initialise payment. Please use WhatsApp.");
        setPaymentProcessing(false);
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setBookingError("Network error. Please use WhatsApp to book.");
      setPaymentProcessing(false);
    }
  };

  // ─── Stripe payment success handler ────────────────────────────
  const handleStripeSuccess = async (paymentIntentId: string) => {
    setPaymentConfirmed(true);
    setSubmitting(true);

    try {
      // Confirm the booking server-side
      const res = await fetch("/api/stripe/confirm-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          duration: selectedDuration,
          price: getPrice(),
          contexts: selectedContexts,
          message: formData.message || undefined,
          referredBy: formData.referredBy || undefined,
          selectedSlot: selectedSlot || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.booking?.roomUrl) {
        setMeetingLink(data.booking.roomUrl);
      }

      if (!res.ok) {
        console.warn("[Stripe] Booking confirmation API failed — payment already taken");
        // Payment already succeeded — booking logged in Stripe dashboard.
        // Manual reconciliation via Stripe payments dashboard.
      }

      setBookingSuccess(true);
    } catch {
      // Payment already succeeded — booking logged in Stripe dashboard
      setBookingSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripeError = (error: string) => {
    setBookingError(error);
  };

  // ─── WhatsApp submission ───────────────────────────────────────
  const handleWhatsAppSubmit = async () => {
    setBookingError(null);
    setSubmitting(true);

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      duration: selectedDuration,
      price: getPrice(),
      contexts: selectedContexts,
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      birthPlace: formData.birthPlace,
      message: formData.message,
      referredBy: formData.referredBy || undefined,
      website: "",
    };

    if (selectedSlot) {
      try {
        const res = await fetch(`/api/slots/${selectedSlot.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setBookingError(data.error || t("booking.bookingError"));
          setSubmitting(false);
          return;
        }
        // Slot booking creates the booking already — no need to call /api/bookings
      } catch {
        setBookingError(t("booking.bookingError"));
        setSubmitting(false);
        return;
      }
    } else {
      // Only call /api/bookings when no slot is selected (to avoid double-creation)
      try {
        await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch { /* non-fatal */ }
    }

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "booking_complete", data: { duration: selectedDuration, price: getPrice(), paymentMethod: "whatsapp" }, page: "/" }),
    }).catch(() => {});

    let birthDetails = "";
    if (formData.birthDate || formData.birthTime || formData.birthPlace) {
      const parts: string[] = [];
      if (formData.birthDate) parts.push(formData.birthDate);
      if (formData.birthTime) parts.push(formData.birthTime);
      if (formData.birthPlace) parts.push(formData.birthPlace);
      birthDetails = parts.join(", ");
    }

    openWhatsApp({
      type: "booking",
      name: formData.name, email: formData.email, phone: formData.phone,
      duration: selectedDuration || "", price: getPrice(),
      contexts: selectedContexts,
      birthDetails: birthDetails || undefined,
      message: formData.message || undefined,
    });

    setBookingSuccess(true);
    setSubmitting(false);
  };

  // ─── Group slots by date ───────────────────────────────────────
  const groupedSlots = (() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = dateGroupKey(s.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.start.localeCompare(b.start));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <section id="booking" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-3xl mx-auto">
        {/* Availability status pill */}
        <div className="mb-6 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06]" aria-live="polite">
            <span className={`relative inline-flex h-2 w-2 rounded-full ${avStyle.dot}`}>
              <span className={`absolute inline-flex h-full w-full rounded-full ${avStyle.dot} animate-ping opacity-40`} />
            </span>
            <span className={`text-[9px] tracking-[0.2em] uppercase ${avStyle.text} font-light`}>
              {avStyle.label}
            </span>
          </div>
        </div>

        <div className="mb-10 sm:mb-14 flex items-center">
          <AvailabilityIndicator variant="line" />
        </div>

        {/* Step 0: Emotional landing */}
        {step === 0 && (
          <div>
            <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
              {t("booking.label")}
            </p>
            <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-2xl mb-8">
              {t("booking.headline1")}{" "}
              <span className="text-[#c9a96e] italic font-light">{t("booking.headline2")}</span>
            </h2>
            <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] max-w-md mb-12 font-light">
              {t("booking.subtitle")}
            </p>
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] transition-colors duration-500 cursor-pointer"
            >
              {t("booking.beginIntake")}
              <span className="text-[#c9a96e]">→</span>
            </button>
          </div>
        )}

        {/* Steps 1-5 */}
        {step > 0 && step < 6 && (
          <>
            {/* Progress indicator */}
            <div className="mb-16" role="navigation" aria-label="Booking progress">
              <div className="flex items-center justify-between mb-3 text-[10px] tracking-[0.3em] uppercase font-mono font-light">
                {STEPS.map((s, i) => (
                  <div key={s.id} className={`flex items-center gap-3 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                    <span
                      aria-current={s.id === step ? "step" : undefined}
                      className={`transition-all duration-300 ${
                        s.id < step
                          ? "text-[#c9a96e] opacity-100"
                          : s.id === step
                          ? "text-[#c9a96e] font-medium scale-110"
                          : "text-[#3a3a3a] opacity-60"
                      }`}
                    >
                      {String(s.id).padStart(2, "0")}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-px transition-colors duration-500 ${s.id < step ? "bg-[#c9a96e]" : "bg-white/[0.06]"}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                {STEPS.map((s) => (
                  <span
                    key={s.id}
                    aria-current={s.id === step ? "step" : undefined}
                    className={`text-center flex-1 first:text-left last:text-right transition-colors duration-300 ${
                      s.id === step ? "text-[#c9a96e] font-medium" : s.id < step ? "text-[#c9a96e]/70" : "text-[#5a5a5a]"
                    }`}
                  >
                    {t(s.labelKey)}
                  </span>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Step 1 — Duration */}
                {step === 1 && (
                  <div>
                    <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-10 font-light">{t("booking.howDeep")}</p>
                    <div className="border-t border-white/[0.06]">
                      {durationKeys.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => { setSelectedDuration(d.value); setSelectedSlot(null); setSkippedSlot(false); setPaymentMethod(null); setClientSecret(null); setMeetingLink(null); }}
                          className={`w-full text-left py-6 border-b border-white/[0.06] transition-colors duration-400 cursor-pointer grid grid-cols-12 gap-4 items-baseline px-2 ${
                            selectedDuration === d.value ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"
                          }`}
                        >
                          <div className="col-span-12 sm:col-span-7">
                            <p className={`text-base sm:text-lg font-serif font-light ${selectedDuration === d.value ? "text-[#c9a96e]" : "text-[#f0eee9]"}`}>
                              {t(d.labelKey)}
                              {d.recommended && (
                                <span className="ml-3 text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]/70 border border-[#c9a96e]/30 px-2 py-0.5 font-light">
                                  {t("booking.recommended")}
                                </span>
                              )}
                            </p>
                            <p className="text-[12px] text-[#7a7a7a] mt-2 font-light">{t(d.sublabelKey)}</p>
                          </div>
                          <div className="col-span-12 sm:col-span-5 sm:text-right">
                            <p className="text-[#c9a96e] text-lg font-serif font-light">{d.price}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2 — Slot picker */}
                {step === 2 && (
                  <div>
                    <p className="text-[#f0eee9] text-xl sm:text-2xl font-serif font-light mb-3 leading-tight">{t("booking.slotTitle")}</p>
                    <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-10 font-light">{t("booking.slotSubtitle")}</p>
                    {slotsLoading && (
                      <div className="border-t border-white/[0.06] py-10 text-center">
                        <p className="text-[#7a7a7a] text-sm font-light animate-pulse">{t("booking.slotLoading")}</p>
                      </div>
                    )}
                    {!slotsLoading && slotsError && (
                      <div className="border-t border-white/[0.06] py-10 text-center">
                        <p className="text-[#7a7a7a] text-sm font-light mb-4">{slotsError}</p>
                        <button onClick={() => selectedDuration && fetchSlots(selectedDuration)} className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] transition-colors cursor-pointer">
                          {t("booking.slotRetryBtn")} →
                        </button>
                      </div>
                    )}
                    {!slotsLoading && !slotsError && slots.length === 0 && (
                      <div className="border-t border-white/[0.06] py-10">
                        <p className="text-[#9a9a9a] text-sm font-light mb-2 text-center">{t("booking.slotEmpty")}</p>
                        <p className="text-[#7a7a7a] text-xs font-light mb-6 text-center max-w-md mx-auto">{t("booking.slotEmptyHint")}</p>
                        <div className="text-center">
                          <button onClick={handleSkipSlot} className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] transition-colors cursor-pointer">
                            {t("booking.slotEmptyCta")} →
                          </button>
                        </div>
                      </div>
                    )}
                    {!slotsLoading && !slotsError && slots.length > 0 && (
                      <div className="space-y-8 max-h-[28rem] overflow-y-auto pr-2 -mr-2 [scrollbar-width:thin] [scrollbar-color:#c9a96e40_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#c9a96e]/30 [&::-webkit-scrollbar-thumb:hover]:bg-[#c9a96e]/60">
                        {groupedSlots.map(([dateKey, daySlots]) => (
                          <div key={dateKey}>
                            <div className="flex items-center gap-3 mb-3">
                              <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/80 font-light" style={{ fontFamily: "Cinzel, serif" }}>
                                {formatDateLong(daySlots[0].start)}
                              </p>
                              <div className="flex-1 h-px bg-[#c9a96e]/15" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px">
                              {daySlots.map((slot) => {
                                const isSelected = selectedSlot?.id === slot.id;
                                return (
                                  <button
                                    key={slot.id}
                                    onClick={() => handleSlotSelect(slot)}
                                    className={`text-left px-3 py-3 transition-all duration-300 cursor-pointer border-b ${
                                      isSelected ? "border-[#c9a96e] bg-[#c9a96e]/[0.06]" : "border-white/[0.04] hover:border-[#c9a96e]/40 hover:bg-white/[0.015]"
                                    }`}
                                  >
                                    <p className={`font-mono text-sm ${isSelected ? "text-[#c9a96e]" : "text-[#f0eee9]"} font-light`}>{formatSlotTime(slot.start)}</p>
                                    <p className="text-[10px] text-[#5a5a5a] mt-0.5 font-light">{slot.duration} min</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!slotsLoading && !slotsError && slots.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                        {selectedSlot ? (
                          <p className="text-[11px] tracking-[0.2em] uppercase text-[#c9a96e] font-light">
                            {t("booking.slotSelected")}:{" "}
                            <span className="font-mono normal-case tracking-normal">{formatDateShort(selectedSlot.start)} · {formatSlotTime(selectedSlot.start)}</span>
                          </p>
                        ) : (
                          <span className="text-[11px] text-[#5a5a5a] font-light">{t("booking.confirmSlotNone")}</span>
                        )}
                        <button onClick={handleSkipSlot} className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors cursor-pointer">{t("booking.slotFallbackCta")} →</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3 — Context */}
                {step === 3 && (
                  <div>
                    <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-10 font-light">{t("booking.whatResonates")}</p>
                    <div className="border-t border-white/[0.06]">
                      {contextKeys.map((ctxKey, i) => (
                        <button
                          key={ctxKey}
                          onClick={() => toggleContext(ctxKey)}
                          className={`w-full text-left py-4 border-b border-white/[0.06] transition-colors duration-400 cursor-pointer flex items-baseline gap-4 px-2 ${
                            selectedContexts.includes(ctxKey) ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"
                          }`}
                        >
                          <span className={`text-[10px] tracking-[0.2em] font-mono ${selectedContexts.includes(ctxKey) ? "text-[#c9a96e]" : "text-[#3a3a3a]"}`}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className={`text-sm font-light flex-1 ${selectedContexts.includes(ctxKey) ? "text-[#c9a96e]" : "text-[#9a9a9a]"}`}>
                            {t(ctxKey)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4 — Your details */}
                {step === 4 && (
                  <div className="space-y-6">
                    {formData.referredBy && (
                      <div className="border border-[#c9a96e]/20 bg-[#c9a96e]/[0.04] px-4 py-3 flex items-start gap-3">
                        <span aria-hidden="true" className="text-[#c9a96e] text-xs mt-0.5 tracking-widest">✦</span>
                        <div className="flex-1">
                          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/80 mb-1 font-light">You were referred</p>
                          <p className="text-[12px] text-[#cfcabf] font-light leading-relaxed">
                            Referred by <code className="font-mono text-[#c9a96e] tracking-[0.1em]">{formData.referredBy}</code>.
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">{t("booking.prepareChart")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { labelKey: "booking.field.fullName", key: "name" as const, type: "text", placeholderKey: "booking.placeholder.name", autocomplete: "name", required: true },
                        { labelKey: "booking.field.email", key: "email" as const, type: "email", placeholderKey: "booking.placeholder.email", autocomplete: "email", required: true },
                        { labelKey: "booking.field.phone", key: "phone" as const, type: "tel", placeholderKey: "booking.placeholder.phone", autocomplete: "tel", required: false },
                        { labelKey: "booking.field.birthDate", key: "birthDate" as const, type: "date", placeholderKey: "", autocomplete: "bday", required: false },
                        { labelKey: "booking.field.birthTime", key: "birthTime" as const, type: "time", placeholderKey: "", autocomplete: "off", required: false },
                        { labelKey: "booking.field.birthPlace", key: "birthPlace" as const, type: "text", placeholderKey: "booking.placeholder.birthPlace", autocomplete: "off", required: false },
                      ].map((field) => {
                        const fieldId = `booking-field-${field.key}`;
                        const hasFormError = !!bookingError;
                        return (
                          <div key={field.key}>
                            <label htmlFor={fieldId} className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                              {t(field.labelKey)}
                              {field.required && <span aria-hidden="true" className="text-[#c9a96e]/70 ml-1">*</span>}
                            </label>
                            <input
                              id={fieldId}
                              type={field.type}
                              autoComplete={field.autocomplete}
                              value={formData[field.key]}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              required={field.required}
                              aria-required={field.required || undefined}
                              aria-invalid={hasFormError || undefined}
                              aria-describedby={hasFormError ? "booking-error" : undefined}
                              className="w-full bg-transparent border-b border-white/[0.1] px-1 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] transition-colors placeholder:text-[#3a3a3a] font-light"
                              placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-6">
                      <label htmlFor="booking-field-message" className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                        {t("booking.field.anythingElse")}
                      </label>
                      <textarea
                        id="booking-field-message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full bg-transparent border-b border-white/[0.1] px-1 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] transition-colors resize-none placeholder:text-[#3a3a3a] font-light"
                        placeholder={t("booking.placeholder.message")}
                      />
                    </div>
                    <div className="mt-6">
                      <label htmlFor="booking-field-referredBy" className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                        Referred by <span className="text-[#5a5a5a] normal-case tracking-normal">(optional)</span>
                      </label>
                      <input
                        id="booking-field-referredBy"
                        type="text"
                        autoComplete="off"
                        value={formData.referredBy}
                        onChange={(e) => setFormData({ ...formData, referredBy: e.target.value.toUpperCase() })}
                        className="w-full bg-transparent border-b border-white/[0.1] px-1 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/60 focus:outline-none font-mono tracking-[0.1em] uppercase"
                        placeholder="e.g. MXDMN4RH"
                        maxLength={32}
                      />
                    </div>
                  </div>
                )}

                {/* Step 5 — Confirm + Payment method */}
                {step === 5 && (
                  <div className="py-4">
                    {bookingSuccess && paymentMethod === "whatsapp" ? (
                      /* WhatsApp success state */
                      <div className="text-center py-8">
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-6 font-light">{t("booking.label")}</p>
                          <h3 className="text-[#f0eee9] text-2xl sm:text-3xl font-serif font-light mb-4 leading-tight">
                            {selectedSlot ? t("booking.bookingSuccessTitle") : t("booking.sessionReady")}
                          </h3>
                          <p className="text-[#9a9a9a] text-sm leading-[1.8] max-w-md mx-auto mb-8 font-light">
                            {t("booking.completeViaWhatsApp")}
                          </p>
                        </motion.div>
                      </div>
                    ) : bookingSuccess && paymentMethod === "stripe" ? (
                      /* Stripe success state */
                      <div className="text-center py-8">
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-6 font-light">{t("booking.label")}</p>
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#4ade80]/10 text-[#4ade80] mb-6">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          </span>
                          <h3 className="text-[#f0eee9] text-2xl sm:text-3xl font-serif font-light mb-4 leading-tight">
                            Session Booked &amp; Paid
                          </h3>
                          <p className="text-[#9a9a9a] text-sm leading-[1.8] max-w-md mx-auto mb-8 font-light">
                            Your session is confirmed. A confirmation receipt has been sent to your email.
                            Your chart will be prepared based on the details you provided.
                          </p>
                          {selectedSlot && (
                            <div className="inline-block border border-[#c9a96e]/20 bg-[#c9a96e]/[0.04] px-6 py-4 mb-6">
                              <p className="text-[9px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1 font-light">{t("booking.confirmSlot")}</p>
                              <p className="text-[#f0eee9] text-base font-serif font-light">{formatDateLong(selectedSlot.start)}</p>
                              <p className="text-[#c9a96e] font-mono text-sm mt-1">{formatSlotTime(selectedSlot.start)} — {formatSlotTime(selectedSlot.end)} (IST)</p>
                            </div>
                          )}
                          {/* Meeting link */}
                          {meetingLink && (
                            <VideoCallRoom
                              roomUrl={meetingLink}
                              roomName={null}
                              scheduledAt={selectedSlot?.start || null}
                            />
                          )}
                        </motion.div>
                      </div>
                    ) : (
                      <>
                        {/* Summary */}
                        <h3 className="text-[#f0eee9] text-xl sm:text-2xl font-serif font-light mb-4 leading-tight">{t("booking.sessionReady")}</h3>

                        <div className="border-t border-white/[0.06] pt-6 max-w-md mb-8">
                          <p className="text-[9px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-4 font-light">{t("booking.summary")}</p>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#7a7a7a] font-light">{t("booking.summaryDuration")}</span>
                              <span className="text-[#f0eee9] font-light">{selectedDuration} min</span>
                            </div>
                            {selectedSlot && (
                              <div className="flex justify-between gap-4">
                                <span className="text-[#7a7a7a] font-light shrink-0">{t("booking.confirmSlot")}</span>
                                <span className="text-[#f0eee9] font-light text-right font-mono">{formatDateShort(selectedSlot.start)} · {formatSlotTime(selectedSlot.start)}</span>
                              </div>
                            )}
                            <div className="border-t border-white/[0.06] pt-3 mt-3 flex justify-between">
                              <span className="text-[#c9a96e] font-light">{t("booking.investment")}</span>
                              <span className="text-[#c9a96e] font-serif">{getPrice()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment method tabs */}
                        <div className="flex border border-white/[0.08] rounded-sm overflow-hidden mb-8">
                          {stripeAvailable && (
                            <button
                              onClick={() => { setPaymentMethod("stripe"); setBookingError(null); }}
                              className={`flex-1 py-3.5 text-[10px] tracking-[0.3em] uppercase font-light transition-all duration-300 cursor-pointer ${
                                paymentMethod === "stripe"
                                  ? "bg-[#c9a96e] text-[#050505]"
                                  : "bg-transparent text-[#7a7a7a] hover:text-[#f0eee9] hover:bg-white/[0.02]"
                              }`}
                            >
                              Pay Online
                            </button>
                          )}
                          {stripeAvailable && <div className="w-px bg-white/[0.08]" />}
                          <button
                            onClick={() => { setPaymentMethod("whatsapp"); setBookingError(null); }}
                            className={`flex-1 py-3.5 text-[10px] tracking-[0.3em] uppercase font-light transition-all duration-300 cursor-pointer ${
                              paymentMethod === "whatsapp"
                                ? "bg-[#25D366] text-[#050505]"
                                : "bg-transparent text-[#7a7a7a] hover:text-[#f0eee9] hover:bg-white/[0.02]"
                            }`}
                          >
                            Pay via WhatsApp
                          </button>
                        </div>

                        {/* Stripe payment form */}
                        {paymentMethod === "stripe" && !clientSecret && !paymentConfirmed && (
                          <div>
                            <button
                              onClick={handleInitiateStripePayment}
                              disabled={paymentProcessing}
                              className="w-full inline-flex items-center justify-center gap-2 bg-[#c9a96e] hover:bg-[#d4b97e] text-[#050505] px-6 py-3.5 text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {paymentProcessing ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 border border-[#050505] border-t-transparent rounded-full animate-spin" />
                                  Preparing payment…
                                </span>
                              ) : (
                                <>Pay {getPrice()} — Card, UPI, Netbanking →</>
                              )}
                            </button>
                            <p className="mt-3 text-[9px] text-[#5a5a5a] font-light leading-relaxed text-center">
                              UPI, Credit/Debit Card, Netbanking, Wallet — all supported
                            </p>
                          </div>
                        )}

                        {/* Stripe PaymentElement (shown after clientSecret is ready) */}
                        {paymentMethod === "stripe" && clientSecret && !paymentConfirmed && (
                          <StripePaymentWrapper
                            clientSecret={clientSecret}
                            amount={getPrice()}
                            onSuccess={handleStripeSuccess}
                            onError={handleStripeError}
                            onBack={() => { setClientSecret(null); setBookingError(null); }}
                          />
                        )}

                        {/* WhatsApp form (shown when selected) */}
                        {paymentMethod === "whatsapp" && (
                          <div>
                            <button
                              onClick={handleWhatsAppSubmit}
                              disabled={submitting}
                              className="w-full inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-[#050505] px-6 py-3.5 text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              {submitting ? t("booking.submitting") : t("booking.finalizeWhatsApp")}
                            </button>
                            <p className="mt-3 text-[9px] text-[#5a5a5a] font-light leading-relaxed text-center">
                              Pay via WhatsApp — no account needed
                            </p>
                          </div>
                        )}

                        {/* Error */}
                        {bookingError && (
                          <p id="booking-error" role="alert" aria-live="assertive" className="mt-6 text-red-400/80 text-sm font-light border-l-2 border-red-400/40 pl-3">{bookingError}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {step > 0 && step < 5 && !bookingSuccess && (
              <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/[0.06]">
                <button onClick={handleBack} className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] border-b border-transparent transition-all duration-300 cursor-pointer font-light pb-1">
                  ← {t("booking.back")}
                </button>
                <button onClick={handleNext} disabled={!canProceed()} className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:border-[#3a3a3a] cursor-pointer hover:border-[#c9a96e] transition-all duration-300 font-light pb-2 px-2">
                  {t("booking.continueBtn")} →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
