import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingDetailPanelProps {
  booking: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    duration: number;
    status: string;
    contexts?: string;
    birthDate?: string;
    birthPlace?: string;
    message?: string;
    scheduledAt?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
    liveKitRoom?: {
      id: string;
      roomName: string;
      createdAt: Date | string;
    };
    paymentIntentId?: string;
    price?: string;
  };
}

/**
 * Admin panel for viewing detailed booking information.
 * Includes client details, payment status, scheduling, and LiveKit room info.
 */
export function BookingDetailPanel({ booking }: BookingDetailPanelProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
    refunded: 'bg-purple-100 text-purple-800',
  };

  const contextList = booking.contexts
    ? JSON.parse(booking.contexts)
    : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{booking.name}</CardTitle>
            <CardDescription>{booking.email}</CardDescription>
          </div>
          <Badge className={statusColors[booking.status] || 'bg-gray-100'}>
            {booking.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Personal Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{booking.phone || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{booking.duration} minutes</p>
            </div>
            {booking.birthDate && (
              <div>
                <p className="text-muted-foreground">Birth Date</p>
                <p className="font-medium">{booking.birthDate}</p>
              </div>
            )}
            {booking.birthPlace && (
              <div>
                <p className="text-muted-foreground">Birth Place</p>
                <p className="font-medium">{booking.birthPlace}</p>
              </div>
            )}
          </div>
        </div>

        {/* Emotional Contexts */}
        {contextList.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Emotional Contexts</h3>
            <div className="flex flex-wrap gap-2">
              {contextList.map((context: string, idx: number) => (
                <Badge key={idx} variant="secondary">
                  {context}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Message */}
        {booking.message && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Message</h3>
            <p className="text-sm text-muted-foreground">{booking.message}</p>
          </div>
        )}

        {/* Session Information */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Session Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Scheduled</p>
              <p className="font-medium">
                {booking.scheduledAt
                  ? format(new Date(booking.scheduledAt), 'MMM dd, yyyy HH:mm')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Booking ID</p>
              <p className="font-mono text-xs">{booking.id.substring(0, 8)}...</p>
            </div>
            {booking.price && (
              <div>
                <p className="text-muted-foreground">Price</p>
                <p className="font-medium">{booking.price}</p>
              </div>
            )}
            {booking.paymentIntentId && (
              <div>
                <p className="text-muted-foreground">Payment ID</p>
                <p className="font-mono text-xs">
                  {booking.paymentIntentId.substring(0, 12)}...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* LiveKit Room */}
        {booking.liveKitRoom && (
          <div className="space-y-2 rounded-lg bg-blue-50 p-3">
            <h3 className="font-semibold text-sm">Video Call</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Room:</span>{' '}
                <span className="font-mono">{booking.liveKitRoom.roomName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Created:</span>{' '}
                {format(
                  new Date(booking.liveKitRoom.createdAt),
                  'MMM dd, yyyy HH:mm'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2 border-t pt-4">
          <h3 className="font-semibold text-sm">Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(booking.createdAt), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{format(new Date(booking.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
