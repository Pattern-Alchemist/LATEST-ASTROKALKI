"use client";

import { useState, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  Loader2,
  RotateCcw,
  Volume2,
  Music,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";

/**
 * RecordingsList — client component for the /account page.
 *
 * Renders the logged-in member's recordings (matched server-side by email
 * → booking.email → recordedReadings). Each recording has a play button
 * that, when clicked:
 *   1) POSTs the member's email to /api/recordings/[id]/token
 *   2) Receives a signed playback URL
 *   3) Loads that URL into an inline HTML5 audio player (no default browser
 *      styling — gold-accented custom controls matching the AstroKalki
 *      design system).
 *
 * Tokens expire after 24 hours. If a token has expired, the audio element
 * will get a 403 on the playback request — we catch that and offer a
 * "Refresh access" button.
 */

export interface AccountRecording {
  id: string;
  title: string;
  duration: number; // minutes
  price: string;
  createdAt: string;
  booking: {
    name: string;
    email: string;
    scheduledAt: string | null;
  } | null;
}

interface Props {
  recordings: AccountRecording[];
  memberEmail: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordingsList({ recordings, memberEmail }: Props) {
  if (recordings.length === 0) {
    return (
      <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
        <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-4 max-w-md">
          No recordings have been shared with you yet. When a session
          recording is ready, it&apos;ll appear here.
        </p>
        <p className="text-[11px] text-[#5a5a5a] font-light italic">
          Recordings are typically available within 24 hours of a completed
          session.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.06]">
      {recordings.map((r, idx) => (
        <RecordingCard
          key={r.id}
          recording={r}
          memberEmail={memberEmail}
          index={idx + 1}
        />
      ))}
    </div>
  );
}

/* ─── Single recording card with inline player ────────────────────── */

function RecordingCard({
  recording,
  memberEmail,
  index,
}: {
  recording: AccountRecording;
  memberEmail: string;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // Audio element state
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(recording.duration * 60);
  const [volume, setVolume] = useState(1);

  // Audio element ref (useRef, not useState — we don't want re-renders when
  // the element mounts/unmounts; we just need to call .play() / .pause() on it).
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchToken = useCallback(async () => {
    setTokenLoading(true);
    setTokenError(null);
    try {
      const res = await fetch(`/api/recordings/${recording.id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenError(data.error || "Failed to authorize playback");
        return null;
      }
      setPlaybackUrl(data.url);
      return data.url as string;
    } catch {
      setTokenError("Network error");
      return null;
    } finally {
      setTokenLoading(false);
    }
  }, [recording.id, memberEmail]);

  const onPlayClick = async () => {
    // First click: expand + fetch token. Subsequent clicks: just toggle.
    if (!expanded) {
      setExpanded(true);
      const url = await fetchToken();
      if (!url) return;
      // Wait one render so the audio element mounts with the new src,
      // then play.
      setTimeout(async () => {
        const a = audioRef.current;
        if (!a) return;
        try {
          a.src = url;
          await a.play();
        } catch {
          /* autoplay can throw — ignore */
        }
      }, 50);
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      // If the token might be expired (24h), refresh it.
      try {
        await a.play();
      } catch {
        // Token may have expired — refresh and retry.
        const url = await fetchToken();
        if (url) {
          a.src = url;
          try {
            await a.play();
          } catch {
            /* give up */
          }
        }
      }
    }
  };

  // Audio event handlers (set on the element directly via ref callback)
  const setAudioEl = (el: HTMLAudioElement | null) => {
    audioRef.current = el;
    if (!el) return;
    el.ontimeupdate = () => setCurrent(el.currentTime);
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0)
        setDuration(el.duration);
    };
    el.onended = () => {
      setPlaying(false);
      setCurrent(0);
    };
    el.onplay = () => setPlaying(true);
    el.onpause = () => setPlaying(false);
    el.onerror = () => {
      // 403 from expired token? Let user retry.
      setTokenError("Playback failed — your access may have expired.");
      setPlaying(false);
    };
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
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
    <div className="py-8 border-b border-white/[0.06] grid grid-cols-1 sm:grid-cols-12 gap-4">
      <div className="sm:col-span-1">
        <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/40 font-mono">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="sm:col-span-7">
        <p className="text-base sm:text-lg text-[#f0eee9] font-serif font-light mb-2 leading-snug">
          {recording.title}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#7a7a7a] font-light">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatDuration(recording.duration)}
          </span>
          <span className="text-[#5a5a5a]">·</span>
          <span className="text-[#9a9a9a]">{formatDate(recording.createdAt)}</span>
          <span className="text-[#5a5a5a]">·</span>
          <span className="text-[#c9a96e]">{recording.price}</span>
        </div>

        {/* Expandable player */}
        {expanded && (
          <div className="mt-5 max-w-xl">
            {tokenError ? (
              <div className="border border-red-400/20 bg-red-400/[0.03] p-4 flex items-start gap-2">
                <AlertCircle className="size-4 text-red-400/70 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-400/80 font-light">
                    {tokenError}
                  </p>
                  <button
                    onClick={async () => {
                      setTokenError(null);
                      const url = await fetchToken();
                      if (url) {
                        const a = audioRef.current;
                        if (a) {
                          a.src = url;
                          try {
                            await a.play();
                          } catch {
                            /* ignore */
                          }
                        }
                      }
                    }}
                    className="mt-2 text-[11px] tracking-[0.25em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 hover:border-[#c9a96e] hover:text-[#f0eee9] pb-0.5 transition-colors"
                  >
                    Refresh access
                  </button>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-[#5a5a5a] hover:text-[#f0eee9]"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="bg-[#050505] border border-white/[0.06] p-4">
                {/* Hidden audio element */}
                <audio
                  ref={setAudioEl}
                  src={playbackUrl || undefined}
                  preload="metadata"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={onPlayClick}
                    disabled={tokenLoading}
                    className="shrink-0 size-11 rounded-full bg-[#c9a96e] text-[#050505] hover:bg-[#d4b97e] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9a9a9a] font-mono">
                      {formatTime(current)} / {formatTime(duration)}
                    </p>
                  </div>

                  <button
                    onClick={restart}
                    className="text-[#7a7a7a] hover:text-[#c9a96e] p-1 transition-colors"
                    aria-label="Restart"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div
                  className="mt-3 cursor-pointer"
                  onClick={seek}
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

                {/* Volume */}
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
                      const a = audioRef.current;
                      if (a) a.volume = v;
                    }}
                    className="flex-1 max-w-[120px] h-1 accent-[#c9a96e] cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sm:col-span-4 flex sm:justify-end items-start">
        {!expanded ? (
          <button
            onClick={onPlayClick}
            disabled={tokenLoading}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors disabled:opacity-50"
          >
            {tokenLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Music className="size-3" />
            )}
            Listen
          </button>
        ) : (
          <button
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors"
          >
            <X className="size-3" />
            Close
          </button>
        )}
      </div>
    </div>
  );
}
