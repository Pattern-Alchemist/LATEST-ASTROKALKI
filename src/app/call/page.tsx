'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LiveKitRoom } from '@/components/astrokalki/livekit-room';
import { Loader, AlertCircle, Home } from 'lucide-react';

/**
 * /call — Video call interface for booked sessions
 *
 * Accessed via:
 * - Direct link: /call?bookingId=XXX
 * - From account portal after booking confirmation
 * - From email confirmation link
 *
 * Shows the full-screen video interface with all controls visible.
 * Gracefully handles missing bookingId with clear instructions.
 */

export default function CallPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');
  const [isLoading, setIsLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch booking data to verify the session
  useEffect(() => {
    if (!bookingId) {
      setError('No booking found. Please check your confirmation email for the call link.');
      setIsLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (!response.ok) {
          throw new Error('Booking not found');
        }
        const data = await response.json();
        setBookingData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-[#c9a96e]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-[#f0eee9]">
                No Booking Found
              </h1>
              <p className="text-sm text-[#9a9a9a]">
                This page requires a valid booking ID. Please check your confirmation email for the correct link to join your session.
              </p>
            </div>
            <button
              onClick={() => router.push('/account')}
              className="inline-flex items-center gap-2 text-sm tracking-widest uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader className="h-8 w-8 animate-spin text-[#c9a96e] mx-auto" />
          <p className="text-[#9a9a9a]">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="rounded-lg border border-[#c9a96e]/20 bg-[#c9a96e]/5 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-[#e5534b]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-[#f0eee9]">
                Unable to Join Call
              </h1>
              <p className="text-sm text-[#9a9a9a]">
                {error}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/account')}
                className="w-full inline-flex items-center justify-center gap-2 text-sm tracking-widest uppercase text-[#f0eee9] border border-white/10 hover:border-white/20 rounded px-4 py-2 transition-colors"
              >
                <Home className="h-4 w-4" />
                Back to Account
              </button>
              <p className="text-xs text-[#5a5a5a]">
                Contact support if the issue persists
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main video call interface
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a0a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#f0eee9]">
              {bookingData?.name || 'Your Session'}
            </h1>
            <p className="text-xs text-[#5a5a5a] mt-1">
              {bookingData?.scheduledAt
                ? new Date(bookingData.scheduledAt).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Session Loading...'}
            </p>
          </div>
          <button
            onClick={() => router.push('/account')}
            className="text-xs tracking-widest uppercase text-[#9a9a9a] hover:text-[#f0eee9] transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Video Call Area */}
      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          bookingId={bookingId}
          userRole="participant"
          onError={(error) => {
            console.error('[v0] Call error:', error);
            setError(error.message);
          }}
          onClose={() => {
            router.push('/account');
          }}
          className="w-full h-full"
        />
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 bg-[#0a0a0a] px-6 py-3 text-center text-xs text-[#5a5a5a]">
        <p>
          Booking ID: <span className="font-mono text-[10px]">{bookingId}</span> •{' '}
          <span
            className="text-[#c9a96e] cursor-pointer hover:underline"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            Copy link
          </span>
        </p>
      </div>
    </div>
  );
}
