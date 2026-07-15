'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * /admin/login — the only /admin route not guarded by middleware.
 *
 * After successful login, redirects to ?redirect= or /admin.
 */
function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in (e.g. navigated here manually), bounce to /admin
  useEffect(() => {
    fetch('/api/admin/stats', { method: 'GET' })
      .then((r) => {
        if (r.ok) router.replace(redirect);
      })
      .catch(() => {});
  }, [router, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          // Honeypot — must remain empty
          website: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.replace(redirect);
      router.refresh();
    } catch {
      setError('Network error — please retry');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070707] text-[#f0eee9] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#a58a54] mb-3">
            AstroKalki
          </p>
          <h1 className="font-serif text-3xl font-light tracking-tight mb-2">
            Admin
          </h1>
          <p className="text-sm text-zinc-500 font-light">
            Restricted access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot — visually hidden, tabbable=false, autocomplete=off */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-9999px',
              width: 1,
              height: 1,
              overflow: 'hidden',
            }}
          >
            <label htmlFor="website">Website (leave empty)</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value=""
              onChange={() => {}}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] tracking-[0.2em] uppercase text-zinc-400 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
              className="w-full bg-transparent border border-zinc-700 focus:border-[#a58a54] px-4 py-3 text-sm outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-light px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#a58a54] hover:bg-[#b08b4f] disabled:bg-zinc-800 disabled:text-zinc-600 text-[#070707] text-sm tracking-[0.15em] uppercase py-3 transition-colors"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>

        <p className="mt-10 text-[10px] text-zinc-700 text-center tracking-wider">
          Unauthorized access is logged.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070707]" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
