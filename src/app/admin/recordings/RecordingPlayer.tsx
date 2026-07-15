"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Loader2, X, RotateCcw, Volume2 } from "lucide-react";

/**
 * RecordingPlayer — minimal admin preview audio player.
 *
 * Used in the admin recordings table to preview an uploaded recording
 * without leaving the page. Plays the audio through a signed-URL endpoint
 * (so playback is gated even for the admin — the admin is making the same
 * request a client would, but authenticating via the booking's email).
 *
 * For admin preview ONLY — the recording's signed URL is fetched by
 * POSTing the booking's email to /api/recordings/[id]/token, which
 * validates the email matches the booking. If the recording has no
 * booking, the admin preview falls back to the direct /recordings/<file>
 * URL (admin is already authed via the /admin cookie).
 *
 * Custom UI (no default browser audio styling):
 *   - Gold play/pause button (left)
 *   - Title + duration
 *   - Progress bar (click to seek)
 *   - Time display (mono)
 *   - Volume control
 *
 * Color palette: gold #c9a96e accent, dark #050505 / #0a0a0a background.
 */

interface Props {
  /** Recording ID. */
  id: string;
  /** Direct audio URL (relative path like /recordings/<file>.mp3) — used as a fallback when no booking exists. */
  audioUrl: string;
  /** Title shown in the player. */
  title: string;
  /** Duration in minutes (used as a fallback before audio metadata loads). */
  durationMinutes: number;
  /** If the recording is attached to a booking, this email is used to fetch a signed playback token. */
  bookingEmail?: string | null;
  /** Compact mode for tight table rows. */
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordingPlayer({
  id,
  audioUrl,
  title,
  durationMinutes,
  bookingEmail,
  compact,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationMinutes * 60);
  const [volume, setVolume] = useState(1);
  const [seeking, setSeeking] = useState(false);

  // ─── Resolve a playback URL ──────────────────────────────────────────
  // If the recording has a booking email, fetch a signed token so we test
  // the real client playback path. Otherwise (admin-only recording), fall
  // back to the direct file URL — admin is already authed via the cookie.
  const resolveSrc = useCallback(async () => {
    if (!bookingEmail) {
      setSrc(audioUrl);
      return;
    }
    setTokenLoading(true);
    setTokenError(null);
    try {
      const res = await fetch(`/api/recordings/${id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: bookingEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenError(data.error || "Failed to authorize playback");
        return;
      }
      setSrc(data.url);
    } catch {
      setTokenError("Network error");
    } finally {
      setTokenLoading(false);
    }
  }, [bookingEmail, id, audioUrl]);

  // Lazy-load the URL on first play (so we don't generate tokens for
  // recordings the admin never previews).
  const ensureSrc = useCallback(async () => {
    if (src || tokenLoading) return;
    await resolveSrc();
  }, [src, tokenLoading, resolveSrc]);

  // ─── Audio element events ────────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      if (!seeking) setCurrent(a.currentTime);
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [seeking]);

  // ─── Play / pause ────────────────────────────────────────────────────
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    await ensureSrc();
    // Wait one tick so the new src propagates to the audio element.
    if (playing) {
      a.pause();
    } else {
      try {
        await a.play();
      } catch {
        /* autoplay can throw — ignore */
      }
    }
  };

  // ─── Seek ────────────────────────────────────────────────────────────
  const onSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(a.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const target = Math.max(0, Math.min(1, ratio)) * a.duration;
    a.currentTime = target;
    setCurrent(target);
  };

  const restart = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    setCurrent(0);
  };

  const progressPct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="w-full bg-[#050505] border border-white/[0.06] p-3 sm:p-4">
      <audio ref={audioRef} src={src || undefined} preload="none" />

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Play button */}
        <button
          onClick={togglePlay}
          disabled={tokenLoading || !!tokenError}
          className="shrink-0 size-10 sm:size-11 rounded-full bg-[#c9a96e] text-[#050505] hover:bg-[#d4b97e] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {tokenLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : playing ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-light text-[#f0eee9] truncate ${
              compact ? "text-sm" : "text-sm sm:text-base"
            }`}
          >
            {title}
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-mono">
            {formatTime(current)} / {formatTime(duration)}
          </p>
        </div>

        {/* Restart */}
        <button
          onClick={restart}
          disabled={!src}
          className="shrink-0 text-[#7a7a7a] hover:text-[#c9a96e] transition-colors disabled:opacity-30 p-1"
          aria-label="Restart"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="mt-3 group cursor-pointer"
        onClick={onSeekClick}
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="relative h-1.5 bg-white/[0.05] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#a58a54] to-[#c9a96e] transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Volume (hidden in compact mode) */}
      {!compact && (
        <div className="mt-3 flex items-center gap-2">
          <Volume2 className="size-3.5 text-[#5a5a5a]" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="flex-1 max-w-[120px] h-1 accent-[#c9a96e] cursor-pointer"
            aria-label="Volume"
          />
        </div>
      )}

      {/* Error / loading states */}
      {tokenError && (
        <p className="mt-2 text-[11px] text-red-400/70 font-light flex items-center gap-1.5">
          <X className="size-3" />
          {tokenError}
        </p>
      )}
    </div>
  );
}
