'use client';

import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

interface LiveKitRoomProps {
  bookingId: string;
  userRole?: 'participant' | 'presenter' | 'host' | 'admin';
  onError?: (error: Error) => void;
  onJoined?: () => void;
  className?: string;
}

/**
 * LiveKit room component for joining video calls.
 * 
 * Fetches a token from /api/livekit/generate-token and joins the room.
 * Uses LiveKit's React hooks for real-time updates.
 *
 * TODO: Integrate @livekit/components-react after LiveKit SDK setup.
 * For now, displays a placeholder with token fetching logic.
 */
export function LiveKitRoom({
  bookingId,
  userRole = 'participant',
  onError,
  onJoined,
  className = '',
}: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/livekit/generate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId,
            userRole,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate token');
        }

        const data = await response.json();
        setToken(data.token);
        setRoomName(data.roomName);

        onJoined?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [bookingId, userRole, onError, onJoined]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader className="h-6 w-6 animate-spin" />
          <p className="text-sm text-muted-foreground">Preparing your call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
        <p className="text-sm font-medium text-red-900">Error joining call</p>
        <p className="text-xs text-red-700">{error}</p>
      </div>
    );
  }

  if (!token || !roomName) {
    return (
      <div className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${className}`}>
        <p className="text-sm text-yellow-800">Unable to prepare call.</p>
      </div>
    );
  }

  // TODO: Replace with actual LiveKit room component from @livekit/components-react
  // For now, show debugging info and a join link
  return (
    <div className={`space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}>
      <div>
        <p className="text-sm font-medium text-blue-900">Call Ready</p>
        <p className="text-xs text-blue-700">Room: {roomName}</p>
      </div>

      {/* 
        TODO: Integrate LiveKit React components:
        
        import {
          LiveKitRoom,
          VideoConference,
        } from '@livekit/components-react';
        import '@livekit/components-styles';

        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="dark"
          onConnected={onJoined}
          onError={onError}
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      */}

      <div className="rounded bg-blue-100 p-3 text-sm">
        <p className="font-mono text-xs text-blue-900">
          Token: {token.substring(0, 20)}...
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Component integration pending. See source for LiveKit React setup.
        </p>
      </div>
    </div>
  );
}
