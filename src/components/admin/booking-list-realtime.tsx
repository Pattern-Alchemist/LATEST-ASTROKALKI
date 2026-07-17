'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader } from 'lucide-react';

interface Booking {
  id: string;
  name: string;
  email: string;
  duration: number;
  status: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface BookingListRealtimeProps {
  onSelectBooking?: (booking: Booking) => void;
  statusFilter?: string;
}

/**
 * Real-time booking list with Supabase Realtime subscriptions.
 * 
 * Updates dynamically when bookings are created, updated, or cancelled.
 * Supports filtering by status.
 *
 * TODO: Implement Supabase Realtime subscription after live testing.
 * For now, displays a table with basic fetch logic.
 */
export function BookingListRealtime({
  onSelectBooking,
  statusFilter,
}: BookingListRealtimeProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bookings from API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();
        if (statusFilter) {
          query.append('status', statusFilter);
        }

        const response = await fetch(`/api/admin/bookings?${query.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        setBookings(data.bookings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [statusFilter]);

  // TODO: Set up Supabase Realtime subscription
  // useEffect(() => {
  //   const channel = supabaseClient
  //     .channel('bookings')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'Booking',
  //       },
  //       (payload) => {
  //         // Update local state when booking changes
  //         if (payload.eventType === 'INSERT') {
  //           setBookings((prev) => [payload.new as Booking, ...prev]);
  //         } else if (payload.eventType === 'UPDATE') {
  //           setBookings((prev) =>
  //             prev.map((b) => (b.id === payload.new.id ? payload.new : b))
  //           );
  //         } else if (payload.eventType === 'DELETE') {
  //           setBookings((prev) => prev.filter((b) => b.id !== payload.old.id));
  //         }
  //       }
  //     )
  //     .subscribe();
  //
  //   return () => {
  //     supabaseClient.removeChannel(channel);
  //   };
  // }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
    refunded: 'bg-purple-100 text-purple-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Loader className="h-6 w-6 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-900">Error loading bookings</p>
        <p className="text-xs text-red-700">{error}</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">
          No bookings found {statusFilter ? `with status "${statusFilter}"` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Name</TableHead>
            <TableHead className="w-40">Email</TableHead>
            <TableHead className="w-20">Duration</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-40">Scheduled</TableHead>
            <TableHead className="w-32">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              onClick={() => onSelectBooking?.(booking)}
              className="cursor-pointer hover:bg-accent"
            >
              <TableCell className="font-medium">{booking.name}</TableCell>
              <TableCell className="text-sm">{booking.email}</TableCell>
              <TableCell className="text-sm">{booking.duration} min</TableCell>
              <TableCell>
                <Badge className={statusColors[booking.status] || 'bg-gray-100'}>
                  {booking.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {booking.scheduledAt
                  ? format(new Date(booking.scheduledAt), 'MMM dd HH:mm')
                  : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(booking.createdAt), 'MMM dd HH:mm')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
