"use client";

import { useState, useEffect } from "react";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { motion } from "framer-motion";

// ── Stripe promise (lazy) ───────────────────────────────────────────────────

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn("[Stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set");
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// ── Inline Payment Form ──────────────────────────────────────────────────────

interface PaymentFormProps {
  clientSecret: string;
  amount: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

function PaymentForm({ clientSecret, amount, onSuccess, onError, onBack }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setPaymentError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setPaymentError(submitError.message || "Payment validation failed");
        setLoading(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/#booking`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setPaymentError(confirmError.message || "Payment failed");
        onError(confirmError.message || "Payment failed");
      } else if (paymentIntent) {
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      setPaymentError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: {
            type: "tabs",
            defaultCollapsed: false,
          },
          business: { name: "AstroKalki" },
        }}
      />

      {paymentError && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-[11px] text-red-400/80 font-light leading-relaxed border-l-2 border-red-400/40 pl-3"
        >
          {paymentError}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] border-b border-transparent transition-colors cursor-pointer disabled:opacity-50 font-light"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="inline-flex items-center gap-2 bg-[#c9a96e] hover:bg-[#d4b97e] text-[#050505] px-6 py-3 text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border border-[#050505] border-t-transparent rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            <>
              Pay {amount}
              <span>→</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[9px] text-[#5a5a5a] font-light leading-relaxed text-center">
        Secured by Stripe · Your card details are encrypted · We never see your full card number
      </p>
    </form>
  );
}

// ── Standing loader while Stripe.js initialises ─────────────────────────────

function StripeLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 border border-[#c9a96e]/30 border-t-[#c9a96e] rounded-full animate-spin" />
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-light">
          Loading payment…
        </p>
      </div>
    </div>
  );
}

// ── Error state ─────────────────────────────────────────────────────────────

function StripeErrorFallback({ error }: { error: string }) {
  return (
    <div className="border border-red-400/20 bg-red-400/[0.04] px-4 py-4">
      <p className="text-[10px] tracking-[0.3em] uppercase text-red-400/70 mb-2 font-light">
        Payment unavailable
      </p>
      <p className="text-[12px] text-[#9a9a9a] font-light leading-relaxed">{error}</p>
    </div>
  );
}

// ── Exported wrapper ────────────────────────────────────────────────────────

interface StripePaymentWrapperProps {
  clientSecret: string;
  amount: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export default function StripePaymentWrapper({
  clientSecret,
  amount,
  onSuccess,
  onError,
  onBack,
}: StripePaymentWrapperProps) {
  const stripe = getStripePromise();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      setLoadError("Stripe is not configured. Please contact support or use WhatsApp to book.");
    }
  }, [stripe]);

  if (loadError) {
    return <StripeErrorFallback error={loadError} />;
  }

  if (!stripe) {
    return <StripeLoading />;
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#c9a96e",
        colorBackground: "#111111",
        colorText: "#f0eee9",
        colorDanger: "#f87171",
        fontFamily: "Inter, system-ui, sans-serif",
        borderRadius: "4px",
        spacingUnit: "4px",
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Elements stripe={stripe} options={options}>
        <PaymentForm
          clientSecret={clientSecret}
          amount={amount}
          onSuccess={onSuccess}
          onError={onError}
          onBack={onBack}
        />
      </Elements>
    </motion.div>
  );
}
