"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  /** Initial value (from URL ?q=...) */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Reusable editorial search bar — borderless input with a gold underline
 * that intensifies on focus. On submit, GETs /insights?q=<encoded value>.
 *
 * Used on /insights (and reusable on other hubs if we add them).
 */
export default function SearchBar({
  defaultValue = "",
  placeholder = "Search patterns, articles, questions...",
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      // Empty submit clears the search param
      router.push("/insights");
      return;
    }
    router.push(`/insights?q=${encodeURIComponent(trimmed)}`);
  }

  function handleClear() {
    setValue("");
    router.push("/insights");
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search insights"
      className="group relative w-full"
    >
      <div className="relative flex items-center">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a5a] group-focus-within:text-[#c9a96e] transition-colors"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Search AstroKalki insights, articles, and patterns"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-transparent border-0 border-b border-white/[0.08] focus:border-[#c9a96e] pl-7 pr-10 py-3 text-base sm:text-lg text-[#f0eee9] placeholder:text-[#5a5a5a] font-serif font-light tracking-[-0.005em] outline-none transition-colors duration-300 [color-scheme:dark] [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-[#5a5a5a] hover:text-[#c9a96e] transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {/* Gold underline accent — intensifies on focus */}
      <div className="absolute -bottom-px left-0 h-px w-0 bg-[#c9a96e] transition-all duration-500 group-focus-within:w-full" />
    </form>
  );
}
