"use client";

/**
 * AiChat — the "Ask AstroKalki" member-only AI chatbot interface.
 *
 * Used in two places:
 *   1. Embedded in /account as a section (variant="embedded").
 *   2. Full-page on /ask-astrokalki (variant="full").
 *
 * Design:
 *   - Dark editorial (#050505 bg, #c9a96e gold accents).
 *   - Conversation sidebar (collapsible on mobile) + main chat panel.
 *   - User messages: right-aligned, muted gold bg, Inter/Geist sans.
 *   - AI messages: left-aligned, dark card, Playfair serif.
 *   - Loading state: subtle gold pulse on a placeholder AI bubble.
 *   - Markdown rendering for AI responses (links open in new tab, headings
 *     and lists styled to match the editorial system).
 *
 * Auth:
 *   - If `isAuthenticated` is false, render the "sign in to chat" CTA
 *     instead of the chat panel.
 *   - All API calls are auth-gated server-side; the client just hides the UI
 *     for not-signed-in visitors.
 *
 * NOTE on react-markdown: the installed version is v10. It exposes a default
 * export (re-exported from `./lib/index.js`'s named `Markdown`), so we use
 * `import ReactMarkdown from 'react-markdown'` for compatibility with the
 * version installed.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage: string | null;
  lastRole: "user" | "assistant" | null;
  messageCount: number;
}

interface FullConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface AiChatProps {
  /** Whether the visitor is signed in (server-detected). */
  isAuthenticated: boolean;
  /** Optional email to greet the member. */
  email?: string | null;
  /** Layout variant — embedded (account) vs full (dedicated page). */
  variant?: "embedded" | "full";
  /** Optional initial conversation ID (e.g. from /ask-astrokalki?c=xxx). */
  initialConversationId?: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_INPUT_CHARS = 4000;
const MAX_CONVERSATIONS_SHOWN = 30;
const SCROLL_THRESHOLD_PX = 80; // px from bottom where we consider the user "at bottom"

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatRelativeTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

/** Markdown component overrides for AI messages — editorial dark styling. */
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-[1.75]">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[15px] tracking-[0.2em] uppercase text-[#c9a96e] font-sans font-medium mt-4 mb-2 first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[13px] tracking-[0.2em] uppercase text-[#c9a96e]/80 font-sans font-medium mt-4 mb-2 first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-[12px] tracking-[0.2em] uppercase text-[#cfcabf] font-sans font-medium mt-3 mb-1.5 first:mt-0">
      {children}
    </h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none space-y-1 my-3 pl-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-none space-y-1 my-3 pl-0 counter-reset-[item]">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="relative pl-4 before:content-['—'] before:absolute before:left-0 before:text-[#c9a96e]/60 before:text-xs">
      {children}
    </li>
  ),
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => {
    if (!href) return <>{children}</>;
    const isInternal = href.startsWith("/") || href.startsWith("#");
    return (
      <a
        href={href}
        target={isInternal ? undefined : "_blank"}
        rel={isInternal ? undefined : "noopener noreferrer"}
        className="text-[#c9a96e] underline underline-offset-2 decoration-[#c9a96e]/30 hover:decoration-[#c9a96e] transition-colors"
      >
        {children}
      </a>
    );
  },
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-[#f0eee9] font-medium">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-[#cfcabf] italic">{children}</em>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l border-[#c9a96e]/40 pl-4 my-3 italic text-[#cfcabf]">
      {children}
    </blockquote>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="font-mono text-[12px] text-[#c9a96e]/90 bg-white/[0.04] px-1.5 py-0.5 rounded">
      {children}
    </code>
  ),
  hr: () => <hr className="border-white/[0.06] my-4" />,
};

/** Loading bubble — gold pulse placeholder. */
function LoadingBubble() {
  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-2 font-light">
          AstroKalki
        </p>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]"
                style={{
                  animation: `chatPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes chatPulse {
          0%,
          100% {
            opacity: 0.2;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}

/** Empty state — first message prompt suggestions. */
const STARTER_PROMPTS = [
  "Why do I keep choosing partners who need fixing?",
  "I leave relationships the moment they feel safe. What is that?",
  "I think I'm in the Rescuer pattern. How do I know for sure?",
  "What is the difference between love and a trauma bond?",
];

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
        Ask AstroKalki
      </p>
      <h3 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4 max-w-md">
        What pattern are you inside right now?
      </h3>
      <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-md mb-8">
        Ask about your relationships, the loops you can&apos;t break, the
        feelings that keep returning. The AI works in the AstroKalki voice —
        direct, second-person, no mystical jargon.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="text-left text-[13px] text-[#cfcabf] font-light leading-[1.6] p-3 border border-white/[0.06] rounded-lg hover:border-[#c9a96e]/30 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Auth wall — shown when the visitor is not signed in. */
function AuthWall({ variant }: { variant: "embedded" | "full" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 ${
        variant === "full" ? "py-24" : "py-16"
      }`}
    >
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
        Member only
      </p>
      <h3
        className={`font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4 ${
          variant === "full" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
        }`}
      >
        Sign in to chat with AstroKalki AI.
      </h3>
      <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.7] max-w-md mb-8">
        The AI assistant is available 24/7 for members. Ask about your patterns,
        relationships, emotional loops — and get guidance in the AstroKalki
        voice, not a generic chatbot&apos;s.
      </p>
      <Link
        href="/account"
        className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors"
      >
        Sign in to your account
        <span className="text-[#c9a96e]">→</span>
      </Link>
    </div>
  );
}

/** Conversation sidebar item. */
function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <div
      className={`group relative border-b border-white/[0.04] transition-colors ${
        isActive ? "bg-white/[0.03]" : "hover:bg-white/[0.015]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left px-3 py-3 cursor-pointer focus:outline-none focus-visible:bg-white/[0.04]"
      >
        <p
          className={`text-[12px] font-sans font-light leading-snug truncate mb-1 ${
            isActive ? "text-[#c9a96e]" : "text-[#cfcabf]"
          }`}
        >
          {conv.title}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-[#5a5a5a] font-mono">
          <span>{formatRelativeTime(conv.updatedAt)}</span>
          <span>·</span>
          <span>{conv.messageCount} msg</span>
        </div>
        {conv.lastMessage && (
          <p className="text-[11px] text-[#7a7a7a] font-light leading-snug truncate mt-1">
            {conv.lastMessage}
          </p>
        )}
      </button>
      {confirmingDelete ? (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0a0a0a] border border-white/[0.08] rounded px-1.5 py-1">
          <button
            type="button"
            onClick={() => {
              onDelete();
              setConfirmingDelete(false);
            }}
            className="text-[9px] tracking-[0.15em] uppercase text-[#a58a54] hover:text-[#c9a96e] px-1 cursor-pointer"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="text-[9px] tracking-[0.15em] uppercase text-[#5a5a5a] hover:text-[#cfcabf] px-1 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          aria-label="Delete conversation"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-[#3a3a3a] hover:text-[#a58a54] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-9 0v14a2 2 0 002 2h6a2 2 0 002-2V6" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function AiChat({
  isAuthenticated,
  email,
  variant = "embedded",
  initialConversationId = null,
}: AiChatProps) {
  const searchParams = useSearchParams();
  const queryConversationId =
    initialConversationId || searchParams.get("c") || null;

  // ─── State ────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    queryConversationId
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // sending a message
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  // ─── Refs ─────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isAtBottomRef = useRef(true);

  // ─── Auto-resize textarea ─────────────────────────────────────────────
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // ─── Auto-scroll to bottom on new message (only if user is at bottom) ─
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isAtBottomRef.current = distanceFromBottom < SCROLL_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages, loading, scrollToBottom]);

  // ─── Load conversations list ──────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/ai/chat/conversations", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: ConversationSummary[] };
      setConversations(data.conversations || []);
    } catch {
      // silent — sidebar will just be empty
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // ─── Load a conversation's messages ───────────────────────────────────
  const loadConversation = useCallback(
    async (id: string) => {
      setLoadingMessages(true);
      setError(null);
      try {
        const res = await fetch(`/api/ai/chat/conversations/${id}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 404) {
            setError("Conversation not found.");
            setActiveConversationId(null);
            setMessages([]);
          } else {
            setError("Could not load conversation.");
          }
          return;
        }
        const data = (await res.json()) as {
          conversation: FullConversation;
        };
        setMessages(data.conversation.messages);
        setActiveConversationId(id);
        isAtBottomRef.current = true;
        // jump to bottom on conversation switch
        requestAnimationFrame(() => scrollToBottom("auto"));
      } catch {
        setError("Network error loading conversation.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  // Load the initial conversation if requested via URL or prop.
  useEffect(() => {
    if (!isAuthenticated || !queryConversationId) return;
    loadConversation(queryConversationId);
  }, [isAuthenticated, queryConversationId, loadConversation]);

  // ─── New conversation ─────────────────────────────────────────────────
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setSidebarOpen(false);
    isAtBottomRef.current = true;
    // Focus the input
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  // ─── Send message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || loading) return;

      setError(null);
      setInput("");

      // Optimistic: append the user's message immediately.
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      isAtBottomRef.current = true;
      setLoading(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationId: activeConversationId,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          response?: string;
          conversationId?: string;
          error?: string;
        };

        if (!res.ok) {
          // Roll back the optimistic user message.
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempUserMsg.id)
          );
          if (res.status === 401) {
            setError("Your session has expired. Refresh and sign in again.");
          } else if (res.status === 429) {
            setError(
              data.error ||
                "Hourly limit reached. The work continues when you return."
            );
          } else if (res.status === 502) {
            setError(
              data.error ||
                "The pattern is not coming into focus right now. Try again."
            );
          } else {
            setError(data.error || "Something went wrong. Try again.");
          }
          return;
        }

        // Replace the temp user message with the persisted one + append the
        // assistant response. We don't have the real user message ID back
        // from the API, so we just append the assistant message and keep
        // the temp user message in place (its id is unique enough).
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response || "",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Update active conversation ID if this was a new conversation.
        if (data.conversationId && data.conversationId !== activeConversationId) {
          setActiveConversationId(data.conversationId);
        }

        // Refresh the sidebar (new conversation appears, timestamps update).
        refreshConversations();
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setError("Network error — please retry.");
      } finally {
        setLoading(false);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    },
    [activeConversationId, loading, refreshConversations]
  );

  // ─── Delete conversation ──────────────────────────────────────────────
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      // Optimistic removal
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      try {
        await fetch(`/api/ai/chat/conversations/${id}`, {
          method: "DELETE",
        });
      } catch {
        // silent — the optimistic UI is already updated
      }
    },
    [activeConversationId]
  );

  // ─── Submit on Enter (without Shift) ──────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  // ─── Memo: show empty state? ──────────────────────────────────────────
  const showEmptyState = useMemo(
    () => messages.length === 0 && !loading && !loadingMessages && !error,
    [messages.length, loading, loadingMessages, error]
  );

  /* ------------------------------------------------------------------------ */
  /*  Render — not signed in                                                   */
  /* ------------------------------------------------------------------------ */
  if (!isAuthenticated) {
    return (
      <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-lg overflow-hidden">
        <AuthWall variant={variant} />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*  Render — main chat                                                       */
  /* ------------------------------------------------------------------------ */

  const isFull = variant === "full";

  return (
    <div
      className={`bg-[#0a0a0a] border border-white/[0.06] rounded-lg overflow-hidden ${
        isFull ? "h-[calc(100vh-9rem)] min-h-[600px]" : "h-[640px]"
      } flex`}
    >
      {/* ─── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside
        className={`${
          isFull ? "w-72" : "w-60"
        } shrink-0 border-r border-white/[0.06] flex flex-col hidden sm:flex`}
        aria-label="Conversation history"
      >
        <div className="p-3 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={startNewConversation}
            disabled={loading}
            className="w-full text-left text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-3 py-2.5 hover:border-[#c9a96e]/60 hover:bg-[#c9a96e]/[0.04] transition-colors disabled:opacity-50 cursor-pointer"
          >
            + New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations && conversations.length === 0 ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-white/[0.02] rounded animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-[11px] text-[#5a5a5a] font-light leading-relaxed">
                No conversations yet. Ask your first question to begin.
              </p>
            </div>
          ) : (
            conversations
              .slice(0, MAX_CONVERSATIONS_SHOWN)
              .map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => {
                    loadConversation(conv.id);
                    setSidebarOpen(false);
                  }}
                  onDelete={() => handleDeleteConversation(conv.id)}
                />
              ))
          )}
        </div>
        {email && (
          <div className="p-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-[#5a5a5a] font-mono truncate">
              {email}
            </p>
          </div>
        )}
      </aside>

      {/* ─── Mobile sidebar drawer ─────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40 sm:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#070707] border-r border-white/[0.06] z-50 flex flex-col sm:hidden"
              aria-label="Conversation history"
            >
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                <button
                  type="button"
                  onClick={startNewConversation}
                  disabled={loading}
                  className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-3 py-2 hover:border-[#c9a96e]/60 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  + New
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close conversation list"
                  className="text-[#7a7a7a] hover:text-[#c9a96e] p-2 cursor-pointer"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations
                  .slice(0, MAX_CONVERSATIONS_SHOWN)
                  .map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => {
                        loadConversation(conv.id);
                        setSidebarOpen(false);
                      }}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main chat panel ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Header ── */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversation list"
              className="sm:hidden text-[#7a7a7a] hover:text-[#c9a96e] p-1 cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 font-light">
                Ask AstroKalki
              </p>
              <p className="text-[12px] text-[#cfcabf] font-light truncate">
                {activeConversationId
                  ? conversations.find((c) => c.id === activeConversationId)
                      ?.title || "Conversation"
                  : "New conversation"}
              </p>
            </div>
          </div>
          <a
            href="/patterns/atlas"
            className="hidden sm:inline-block text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors"
            aria-label="Browse the Pattern Atlas"
          >
            Atlas →
          </a>
        </div>

        {/* ── Messages ── */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {loadingMessages ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="max-w-[70%] h-16 bg-white/[0.02] rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : showEmptyState ? (
            <EmptyState onPick={(prompt) => sendMessage(prompt)} />
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] ${
                      msg.role === "user" ? "" : "w-full sm:w-[85%] md:w-[80%]"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-2 font-light">
                        AstroKalki
                      </p>
                    )}
                    {msg.role === "user" ? (
                      <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/15 px-4 py-3 rounded-lg">
                        <p className="text-[14px] text-[#f0eee9] font-sans font-light leading-[1.6] whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white/[0.02] border border-white/[0.05] px-4 py-4 rounded-lg">
                        <div className="text-[15px] text-[#cfcabf] font-serif font-light leading-[1.7]">
                          <ReactMarkdown components={markdownComponents}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    <p
                      className={`text-[9px] font-mono text-[#3a3a3a] mt-1.5 ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {formatTimestamp(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {loading && <LoadingBubble />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="px-4 py-2 border-t border-white/[0.06]">
            <p className="text-[12px] text-[#a58a54]/90 font-light leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* ── Input ── */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value.slice(0, MAX_INPUT_CHARS));
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a pattern you keep returning to…"
              rows={1}
              disabled={loading}
              aria-label="Message AstroKalki AI"
              className="flex-1 bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-2 text-[14px] text-[#f0eee9] font-sans font-light outline-none transition-colors placeholder:text-[#3a3a3a] resize-none disabled:opacity-60"
              style={{ minHeight: "2.25rem", maxHeight: "10rem" }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="shrink-0 w-9 h-9 flex items-center justify-center text-[#c9a96e] border border-[#c9a96e]/30 rounded-full hover:border-[#c9a96e]/60 hover:bg-[#c9a96e]/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-[#3a3a3a] font-mono">
              Enter to send · Shift+Enter for new line
            </p>
            <p className="text-[10px] text-[#3a3a3a] font-mono">
              {input.length}/{MAX_INPUT_CHARS}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
