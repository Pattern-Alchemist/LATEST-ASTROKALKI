"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Check, RotateCcw, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface VoiceResult {
  /** Raw ASR text. Empty string when ASR returned nothing. */
  transcription: string;
  /** Canonical option ID/name when the matcher found a confident match,
   *  otherwise null. The caller decides whether to use it. */
  matchedValue: string | null;
  /** 0–1 confidence reported by the matcher. null when no match. */
  confidence: number | null;
}

interface VoiceInputProps {
  /** Micro-reading step (1 = month, 2 = pattern, 3 = frustration). */
  step: 1 | 2 | 3;
  /** Optional user email — sent as context (not stored). */
  email?: string;
  /** Optional honeypot value — should always be empty. */
  website?: string;
  /** Fired when the user clicks "Use this" on a transcription preview. */
  onResult?: (result: VoiceResult) => void;
  /** Fired when the user dismisses/cancels the voice input entirely. */
  onCancel?: () => void;
  /** Optional className applied to the root wrapper. */
  className?: string;
  /** Compact variant — renders just a small mic button that expands into
   *  the full preview UI when used. Default: false (renders the inline
   *  "Speak instead of type" toggle). */
  compact?: boolean;
}

type Phase =
  | "idle"
  | "recording"
  | "transcribing"
  | "preview"
  | "error"
  | "permission-denied"
  | "unsupported";

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function VoiceInput({
  step,
  email,
  website = "",
  onResult,
  onCancel,
  className = "",
  compact = false,
}: VoiceInputProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [durationSec, setDurationSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<VoiceResult | null>(null);

  // Refs that must survive re-renders without triggering them.
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Hydration-safe browser support flag. Defaults to false on SSR; flips
  // after mount so we don't render unsupported fallback markup on the server.
  const [supported, setSupported] = useState(false);

  /* ─── Declaration order matters: any function referenced by another ────
   *  useCallback / useEffect must be declared BEFORE its caller. This keeps
   *  the `react-hooks/immutability` lint rule happy (no forward references)
   *  AND avoids any temporal-dead-zone runtime concerns. */

  /* ─── stopTimer: clears the recording-duration interval ─────────────── */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* ─── stopRecording: stops the active MediaRecorder (if any) ────────── */
  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  /* ─── Browser support detection (mount-only) ───────────────────────── */
  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        typeof window !== "undefined" &&
        typeof window.MediaRecorder !== "undefined"
    );
  }, []);

  /* ─── Transcription API call ───────────────────────────────────────── */
  const transcribe = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        setErrorMsg(t("microReading.voice.noSpeech"));
        setPhase("error");
        return;
      }

      setPhase("transcribing");
      setErrorMsg("");

      const formData = new FormData();
      // Pick a sensible filename + extension based on the blob type so the
      // server can validate the extension even when MIME is missing.
      const ext = blob.type.includes("webm")
        ? "webm"
        : blob.type.includes("ogg")
          ? "ogg"
          : blob.type.includes("mp4") || blob.type.includes("m4a")
            ? "m4a"
            : "webm";
      formData.append("audio", blob, `recording.${ext}`);
      formData.append("step", String(step));
      formData.append("website", website);
      if (email) formData.append("email", email);

      try {
        const res = await fetch("/api/ai/voice-reading", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json().catch(() => ({}))) as
          | VoiceResult & { error?: string };

        if (!res.ok) {
          setErrorMsg(data?.error || t("microReading.voice.error"));
          setPhase("error");
          return;
        }

        // Empty transcription = no speech detected.
        if (!data.transcription || data.transcription.trim() === "") {
          setErrorMsg(data?.error || t("microReading.voice.noSpeech"));
          setPhase("error");
          return;
        }

        setResult({
          transcription: data.transcription,
          matchedValue: data.matchedValue ?? null,
          confidence:
            typeof data.confidence === "number" ? data.confidence : null,
        });
        setPhase("preview");
      } catch (err) {
        console.error("voice-reading fetch error:", err);
        setErrorMsg(t("microReading.voice.error"));
        setPhase("error");
      }
    },
    [step, email, website, t]
  );

  /* ─── startTimer: kicks off the duration interval (60s hard cap) ───── */
  const startTimer = useCallback(() => {
    setDurationSec(0);
    timerRef.current = setInterval(() => {
      setDurationSec((s) => {
        // Hard cap at 60s — anything longer is unlikely to transcribe well
        // and we want to protect the user from runaway recordings.
        if (s >= 60) {
          stopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
  }, [stopRecording]);

  /* ─── startRecording: requests mic access + starts MediaRecorder ───── */
  const startRecording = useCallback(async () => {
    setErrorMsg("");
    setResult(null);
    setDurationSec(0);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setPhase("unsupported");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      // Distinguish permission-denied from other failures.
      const name = (err as { name?: string })?.name;
      if (
        name === "NotAllowedError" ||
        name === "SecurityError" ||
        name === "PermissionDeniedError"
      ) {
        setPhase("permission-denied");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setErrorMsg(t("microReading.voice.noMic"));
        setPhase("error");
      } else {
        setErrorMsg(t("microReading.voice.error"));
        setPhase("error");
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    // Pick the best supported mime type. Most browsers ship audio/webm;
    // Safari falls back to audio/mp4 (or fails the type check, in which
    // case we let MediaRecorder pick the default).
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    let mimeType = "";
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        mimeType = c;
        break;
      }
    }

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      console.error("MediaRecorder construction failed:", err);
      stream.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      setErrorMsg(t("microReading.voice.error"));
      setPhase("error");
      return;
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stopTimer();
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      // Release the mic immediately — we don't need it during transcription.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      transcribe(blob);
    };

    recorder.onerror = () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      setErrorMsg(t("microReading.voice.error"));
      setPhase("error");
    };

    recorder.start();
    setPhase("recording");
    startTimer();
  }, [startTimer, stopTimer, transcribe, t]);

  /* ─── Cleanup on unmount: stop tracks + clear timer ─────────────────── */
  useEffect(() => {
    return () => {
      stopTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, [stopTimer]);

  /* ─── Reset / cancel ───────────────────────────────────────────────── */
  const reset = useCallback(() => {
    setResult(null);
    setErrorMsg("");
    setDurationSec(0);
    setPhase("idle");
  }, []);

  const handleCancel = useCallback(() => {
    reset();
    onCancel?.();
  }, [reset, onCancel]);

  const handleUse = useCallback(() => {
    if (result) onResult?.(result);
    // Reset back to idle after firing — caller may unmount us, but if they
    // don't, we want to be ready for another take.
    reset();
  }, [result, onResult, reset]);

  /* ─── Don't render anything if the browser can't do MediaRecorder ──── */
  if (!supported) return null;
  if (phase === "unsupported") return null;

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                         */
  /* ------------------------------------------------------------------ */

  const durationLabel = `${Math.floor(durationSec / 60)}:${String(
    durationSec % 60
  ).padStart(2, "0")}`;

  // ── Compact mode: just a small mic button → expands inline on click ──
  if (compact && phase === "idle") {
    return (
      <button
        type="button"
        onClick={startRecording}
        aria-label={t("microReading.voice.speakAria")}
        title={t("microReading.voice.speak")}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/10 hover:border-[#c9a96e]/60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] ${className}`}
      >
        <Mic className="w-3.5 h-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        {/* ─── IDLE ─── */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#c9a96e]/70 hover:text-[#c9a96e] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] py-1"
            >
              <Mic className="w-3.5 h-3.5" aria-hidden />
              <span>{t("microReading.voice.speak")}</span>
            </button>
          </motion.div>
        )}

        {/* ─── RECORDING ─── */}
        {phase === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3"
          >
            {/* Pulsing red dot + duration */}
            <span className="relative inline-flex w-2.5 h-2.5">
              <span
                className="absolute inline-flex w-full h-full rounded-full bg-[#c43b3b] opacity-75 animate-ping"
                aria-hidden
              />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#c43b3b]" />
            </span>
            <span
              className="font-mono text-[11px] text-[#cfcabf] tabular-nums"
              aria-live="polite"
            >
              {durationLabel}
            </span>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a]">
              {t("microReading.voice.recording")}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              aria-label={t("microReading.voice.stopAria")}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#c43b3b]/60 text-[#c43b3b] hover:bg-[#c43b3b]/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c43b3b]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              <Square className="w-3 h-3" aria-hidden />
            </button>
          </motion.div>
        )}

        {/* ─── TRANSCRIBING ─── */}
        {phase === "transcribing" && (
          <motion.div
            key="transcribing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a]"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c9a96e]" aria-hidden />
            <span>{t("microReading.voice.transcribing")}</span>
          </motion.div>
        )}

        {/* ─── PREVIEW (transcription shown for confirmation) ─── */}
        {phase === "preview" && result && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#c9a96e]/60 font-light">
              {t("microReading.voice.weHeard")}
            </p>
            <p className="bg-white/[0.02] border border-white/[0.04] p-3 text-sm italic text-[#cfcabf] font-serif leading-relaxed">
              &ldquo;{result.transcription}&rdquo;
            </p>
            {result.matchedValue && result.confidence !== null && (
              <p className="text-[10px] text-[#7a7a7a] tracking-wide">
                {t("microReading.voice.confidencePrefix")}{" "}
                <span className="text-[#c9a96e]/80">
                  {Math.round(result.confidence * 100)}%
                </span>
                {result.confidence >= 0.85 ? (
                  <span className="ml-2 text-[#9a9a9a]">
                    {t("microReading.voice.confidenceHigh")}
                  </span>
                ) : (
                  <span className="ml-2 text-[#9a9a9a]">
                    {t("microReading.voice.confidenceLow")}
                  </span>
                )}
              </p>
            )}
            <div className="flex items-center gap-5 pt-1">
              <button
                type="button"
                onClick={handleUse}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] hover:text-[#f0eee9] border-b border-[#c9a96e]/40 hover:border-[#c9a96e] pb-1 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" aria-hidden />
                <span>{t("microReading.voice.useThis")}</span>
              </button>
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] border-b border-white/[0.06] hover:border-white/[0.2] pb-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden />
                <span>{t("microReading.voice.tryAgain")}</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="ml-auto text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#7a7a7a] transition-colors cursor-pointer"
              >
                {t("microReading.voice.cancel")}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── ERROR ─── */}
        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <p className="text-[11px] text-[#cfcabf]/70 leading-relaxed italic font-serif">
              {errorMsg || t("microReading.voice.error")}
            </p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] hover:text-[#f0eee9] border-b border-[#c9a96e]/40 hover:border-[#c9a96e] pb-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden />
                <span>{t("microReading.voice.tryAgain")}</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#7a7a7a] transition-colors cursor-pointer"
              >
                {t("microReading.voice.cancel")}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── PERMISSION DENIED ─── */}
        {phase === "permission-denied" && (
          <motion.div
            key="perm-denied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2"
          >
            <MicOff
              className="w-3.5 h-3.5 mt-0.5 text-[#c9a96e]/50 shrink-0"
              aria-hidden
            />
            <p className="text-[11px] text-[#9a9a9a] leading-relaxed italic font-serif">
              {t("microReading.voice.permissionDenied")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
