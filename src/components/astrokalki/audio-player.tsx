"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

/**
 * AudioPlayer — minimal editorial audio narration player for articles +
 * guides.
 *
 * Behavior:
 *   1. On mount, probe GET /api/tts/{slug} — if 404, the player self-
 *      hides (no narration generated for this slug yet).
 *   2. If audio exists, render the player:
 *        ┌──────────────────────────────────────────────┐
 *        │  LISTEN                                       │
 *        │  ▶   ─────●───────────   00:42 / 08:31  1x ▾ │
 *        └──────────────────────────────────────────────┘
 *   3. Play/pause, draggable scrubber, speed control (0.75x / 1x /
 *      1.25x / 1.5x), live time display.
 *
 * The audio bytes themselves are served from the public/audio/<slug>.mp3
 * static path (set after the probe confirms existence). The /api/tts/
 * endpoint is used only for the existence probe because it returns a
 * clean 404 when no narration has been generated yet.
 *
 * Design system: bg #050505, gold #c9a96e. Player sits on a
 * bg-white/[0.02] panel with a thin border. "LISTEN" eyebrow in Cinzel.
 * Time + speed labels in mono. Gold play icon. NO blue/indigo.
 */

interface AudioPlayerProps {
  slug: string;
}

const CINZEL = { fontFamily: "var(--font-cinzel)" } as const;

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

type LoadState = "probing" | "ready" | "missing";

/** Format seconds as M:SS (or H:MM:SS for very long narrations). */
function formatTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function AudioPlayer({ slug }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<LoadState>("probing");
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const seekValueRef = useRef<number>(0);

  // ─── Probe for audio existence ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setState("probing");

    (async () => {
      try {
        const res = await fetch(`/api/tts/${encodeURIComponent(slug)}`, {
          method: "GET",
          // We just need the status; but Next 16 route handlers don't
          // expose HEAD reliably across deployment targets, and the body
          // for an MP3 is small enough that fetching headers via a
          // `cache: 'no-store'` GET that we then abort is wasteful. We
          // just fetch normally — the audio element will reuse the cached
          // response for playback since we set Cache-Control: public,
          // max-age=86400 on the server.
          cache: "default",
        });
        if (cancelled) return;
        if (res.ok) {
          setState("ready");
        } else if (res.status === 404) {
          setState("missing");
        } else {
          // Treat any other status as transient error → keep probing UI
          // so the user can refresh; we don't want to permanently hide.
          setState("missing");
        }
      } catch {
        if (!cancelled) setState("missing");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ─── Audio element event wiring ────────────────────────────────────
  const onLoadedMetadata = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isFinite(a.duration) && a.duration > 0) {
      setDuration(a.duration);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a || seeking) return;
    setCurrent(a.currentTime);
  }, [seeking]);

  const onPlay = useCallback(() => setIsPlaying(true), []);
  const onPause = useCallback(() => setIsPlaying(false), []);
  const onEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrent(0);
  }, []);

  // Apply playback rate when speed changes.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // ─── Click handlers ────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play().catch((err) => {
        // Autoplay-blocked or fetch failed — log + leave paused.
        console.error("[audio] play failed:", err);
      });
    } else {
      a.pause();
    }
  }, []);

  const seekToFraction = useCallback((frac: number) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration) || a.duration <= 0) return;
    const clamped = Math.max(0, Math.min(1, frac));
    a.currentTime = clamped * a.duration;
    setCurrent(a.currentTime);
  }, []);

  // ─── Progress bar interaction (mouse + touch) ──────────────────────
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const getFractionFromEvent = useCallback((clientX: number): number => {
    const el = progressBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onScrubberMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setSeeking(true);
      const frac = getFractionFromEvent(e.clientX);
      seekValueRef.current = frac;
      setCurrent(frac * (duration || 0));

      const onMove = (ev: MouseEvent) => {
        const f = getFractionFromEvent(ev.clientX);
        seekValueRef.current = f;
        setCurrent(f * (duration || 0));
      };
      const onUp = () => {
        setSeeking(false);
        seekToFraction(seekValueRef.current);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [duration, getFractionFromEvent, seekToFraction]
  );

  const onScrubberTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setSeeking(true);
      const touch = e.touches[0];
      const frac = getFractionFromEvent(touch.clientX);
      seekValueRef.current = frac;
      setCurrent(frac * (duration || 0));

      const onMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (!t) return;
        const f = getFractionFromEvent(t.clientX);
        seekValueRef.current = f;
        setCurrent(f * (duration || 0));
      };
      const onEnd = () => {
        setSeeking(false);
        seekToFraction(seekValueRef.current);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
        window.removeEventListener("touchcancel", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
      window.addEventListener("touchcancel", onEnd);
    },
    [duration, getFractionFromEvent, seekToFraction]
  );

  // ─── Hide if no audio exists ───────────────────────────────────────
  if (state === "missing") return null;

  const progressFrac = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="my-10"
      aria-label="Audio narration player"
    >
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-4">
        {/* LISTEN eyebrow */}
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]/60"
            style={CINZEL}
          >
            {state === "probing" ? "Listen" : "Listen to this article"}
          </p>
          {/* Speed control */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSpeedMenuOpen((v) => !v)}
              className="font-mono text-[10px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors tracking-wider px-2 py-1 border border-transparent hover:border-white/[0.06]"
              aria-label={`Playback speed: ${speed}x`}
              aria-expanded={speedMenuOpen}
            >
              {speed}x
            </button>
            {speedMenuOpen && (
              <>
                {/* Click-away catcher */}
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 cursor-default"
                  onClick={() => setSpeedMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-[#0a0a0a] border border-white/[0.08] py-1 z-10 min-w-[68px]">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        setSpeedMenuOpen(false);
                      }}
                      className={`block w-full text-left font-mono text-[10px] px-3 py-1.5 tracking-wider transition-colors ${
                        s === speed
                          ? "text-[#c9a96e] bg-white/[0.03]"
                          : "text-[#7a7a7a] hover:text-[#f0eee9]"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main player row */}
        <div className="flex items-center gap-4">
          {/* Play / pause button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={state === "probing"}
            aria-label={isPlaying ? "Pause narration" : "Play narration"}
            className="shrink-0 w-10 h-10 rounded-full border border-[#c9a96e]/40 hover:bg-[#c9a96e]/10 transition-colors flex items-center justify-center group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state === "probing" ? (
              <span className="block w-3 h-3 rounded-full border border-[#c9a96e]/40 border-t-[#c9a96e] animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-3.5 text-[#c9a96e]" fill="currentColor" />
            ) : (
              <Play className="size-3.5 text-[#c9a96e] translate-x-[1px]" fill="currentColor" />
            )}
          </button>

          {/* Progress bar */}
          <div
            ref={progressBarRef}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.floor(duration))}
            aria-valuenow={Math.floor(current)}
            tabIndex={0}
            onMouseDown={onScrubberMouseDown}
            onTouchStart={onScrubberTouchStart}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") seekToFraction(progressFrac - 0.02);
              if (e.key === "ArrowRight") seekToFraction(progressFrac + 0.02);
            }}
            className="flex-1 h-1 bg-white/[0.06] relative cursor-pointer group"
          >
            {/* Gold fill */}
            <div
              className="absolute inset-y-0 left-0 bg-[#c9a96e]"
              style={{ width: `${progressFrac * 100}%` }}
            />
            {/* Scrubber dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#c9a96e] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressFrac * 100}%` }}
            />
          </div>

          {/* Time display */}
          <div className="font-mono text-[10px] text-[#7a7a7a] tracking-wider tabular-nums whitespace-nowrap min-w-[78px] text-right">
            {formatTime(current)} / {formatTime(duration)}
          </div>
        </div>

        {/* Hidden audio element — drives everything */}
        {state === "ready" && (
          <audio
            ref={audioRef}
            src={`/audio/${encodeURIComponent(slug)}.mp3`}
            preload="metadata"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onEnded}
            onDurationChange={onLoadedMetadata}
            crossOrigin="anonymous"
          />
        )}

        {/* Error fallback — if the audio element errors out at runtime */}
        <noscript>
          <p className="mt-3 text-[10px] text-[#7a7a7a] font-mono">
            Enable JavaScript to listen to this article.
          </p>
        </noscript>
      </div>

      {/* Subtle helper line — only show when paused + at start */}
      {!isPlaying && current === 0 && state === "ready" && (
        <p className="mt-2 text-[10px] text-[#5a5a5a] font-light tracking-wide pl-1">
          Press play to listen instead of read. {duration > 0 ? `${formatTime(duration)} audio.` : ""}
        </p>
      )}
    </motion.div>
  );
}
