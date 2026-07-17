# AstroKalki Production Booking & LiveKit Integration

This is a complete production-ready implementation of a booking system with video call integration for AstroKalki deployed on Vercel, Supabase, and LiveKit.

## What's Included

### Core Components

1. **Database Layer** (`prisma/schema.prisma`)
   - Migrated from SQLite to Supabase PostgreSQL
   - Optimized indexes for fast queries
   - LiveKitRoom model for tracking video calls

2. **APIs**
   - **`/api/slots`** - Get available booking slots (optimized, <500ms)
   - **`/api/admin/bookings`** - Admin booking management with real-time updates
   - **`/api/livekit/create-room`** - Create video rooms on booking confirmation
   - **`/api/livekit/generate-token`** - Generate secure JWT for room access
   - **`/api/cron/cleanup-rooms`** - Scheduled room cleanup
   - **`/api/cron/send-reminders`** - 24-hour booking reminders

3. **Frontend Components**
   - **`LiveKitRoom`** - React component to join and display video calls
   - **`BookingDetailPanel`** - Admin view of full booking info
   - **`BookingListRealtime`** - Real-time booking list with Supabase subscriptions

4. **Utilities**
   - **Logger** - Structured logging with correlation IDs
   - **Supabase client** - Connection pooling for serverless
   - **Validators** - Zod schemas for all inputs
   - **Slots service** - Availability logic and queries

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create `.env.local`:
```
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
LIVEKIT_API_KEY=APIxxxxxx
LIVEKIT_API_SECRET=secret-xxxxx
LIVEKIT_URL=https://livekit.example.com
ADMIN_SECRET=your-secret
CRON_SECRET=your-cron-secret
```

### 3. Run Database Migrations
```bash
npm run db:migrate
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Test APIs
```bash
# Get available slots
curl http://localhost:3000/api/slots?duration=60&limit=5

# Get admin bookings
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  http://localhost:3000/api/admin/bookings?limit=10
```

## Architecture

### Request Flow: Booking Creation

```
1. User fills booking form
   ↓
2. POST /api/bookings (create booking)
   ↓
3. Booking saved to Supabase with status='pending'
   ↓
4. Booking payment processed via Stripe
   ↓
5. POST /api/livekit/create-room (on payment success)
   ↓
6. LiveKit room created and stored in LiveKitRoom table
   ↓
7. Email/WhatsApp confirmation sent
   ↓
8. User sees "Join Call" button
   ↓
9. POST /api/livekit/generate-token (when joining)
   ↓
10. JWT token generated, LiveKit room joined
```

### Real-time Admin Updates

```
Admin Dashboard
    ↓
Supabase Realtime subscription to bookings table
    ↓
On any booking change (status update, new booking):
- Auto-refresh booking list in BookingListRealtime
- Show live status updates
- Highlight new bookings
```

### Scheduled Tasks

```
Hourly Cron (0 * * * *)
    ↓
1. Cleanup: Delete LiveKit rooms for ended bookings
2. Reminders: Send 24h booking reminders
```

## Key Features

### Performance
- **Slots API**: <500ms response time (optimized queries, indexed)
- **Connection Pooling**: PgBouncer for Vercel serverless
- **Caching**: 60s with 5-minute stale-while-revalidate
- **Timeout Guard**: 5s hard limit with graceful degradation

### Observability
- **Correlation IDs**: Track requests across logs
- **Structured Logging**: JSON format for easy parsing
- **Error Tracking**: Full stack traces with context

### Security
- **Auth Middleware**: Admin and LiveKit routes protected
- **Input Validation**: Zod schemas on all endpoints
- **Role-based Access**: User vs admin permissions
- **Secure Tokens**: JWT with expiry and user-specific roles

### Real-time
- **Supabase Realtime**: Live booking updates for admins
- **Conflict Prevention**: Database constraints prevent double-booking
- **Optimistic Locking**: Version tracking for concurrent updates

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── slots/
│   │   │   └── route.ts          # Get available slots
│   │   ├── bookings/
│   │   │   └── route.ts          # Create/fetch bookings
│   │   ├── admin/
│   │   │   └── bookings/
│   │   │       └── route.ts      # Admin bookings list
│   │   ├── livekit/
│   │   │   ├── create-room/
│   │   │   │   └── route.ts      # Create video room
│   │   │   └── generate-token/
│   │   │       └── route.ts      # Generate JWT token
│   │   └── cron/
│   │       ├── cleanup-rooms/
│   │       │   └── route.ts      # Cleanup old rooms
│   │       └── send-reminders/
│   │           └── route.ts      # Send 24h reminders
│   └── admin/
│       └── bookings/
│           └── page.tsx          # Admin booking dashboard
├── components/
│   ├── astrokalki/
│   │   ├── booking.tsx           # Main booking form
│   │   └── livekit-room.tsx      # Video room component
│   └── admin/
│       ├── booking-detail-panel.tsx        # Booking details
│       └── booking-list-realtime.tsx       # Live booking list
├── lib/
│   ├── logger.ts                 # Structured logging
│   ├── supabase.ts               # Supabase client
│   ├── validators.ts             # Zod schemas
│   ├── slots-service.ts          # Slot availability logic
│   ├── livekit.ts                # LiveKit helpers
│   └── prisma.ts                 # Prisma client
├── middleware.ts                 # Auth/authz middleware
└── ...

prisma/
├── schema.prisma                 # PostgreSQL schema
└── migrations/                   # Database migrations

docs/
├── IMPLEMENTATION_SUMMARY.md     # Detailed implementation
├── DEPLOYMENT_GUIDE.md           # Deployment instructions
└── LIVEKIT_INTEGRATION_README.md # This file
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PRISMA_URL` | Pooled database URL | `postgresql://user:pass@host/db?schema=public` |
| `POSTGRES_URL_NON_POOLING` | Direct database URL for migrations | `postgresql://user:pass@host/db` |
| `LIVEKIT_API_KEY` | LiveKit API key | `APIxxxxx` |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `secret-xxxxx` |
| `LIVEKIT_URL` | LiveKit server URL | `https://livekit.example.com` |
| `ADMIN_SECRET` | Admin auth token | `your-secret-xxxxx` |
| `CRON_SECRET` | Cron job auth token | `your-cron-xxxxx` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Supabase key | `eyJhbGc...` |

## Testing Endpoints

### Public Endpoints

**Get available slots:**
```bash
curl "http://localhost:3000/api/slots?duration=60&limit=10"
```

**Create booking:**
```bash
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "duration": 60,
    "slotId": "slot-id-here",
    "birthDate": "1990-01-01",
    "birthPlace": "New York"
  }'
```

### Admin Endpoints (require `Authorization: Bearer $ADMIN_SECRET`)

**Get bookings:**
```bash
curl -H "Authorization: Bearer your-admin-secret" \
  "http://localhost:3000/api/admin/bookings?limit=20"
```

**Search bookings:**
```bash
curl -H "Authorization: Bearer your-admin-secret" \
  "http://localhost:3000/api/admin/bookings?search=john@example.com"
```

### Cron Endpoints (require `Authorization: Bearer $CRON_SECRET`)

**Cleanup rooms:**
```bash
curl -X POST -H "Authorization: Bearer your-cron-secret" \
  "http://localhost:3000/api/cron/cleanup-rooms"
```

**Send reminders:**
```bash
curl -X POST -H "Authorization: Bearer your-cron-secret" \
  "http://localhost:3000/api/cron/send-reminders"
```

## Debugging

### View Logs with Correlation IDs

All API responses include a `requestId`:
```bash
curl "http://localhost:3000/api/slots" | jq '.requestId'
# Output: "f5c263fe-a7a3-411a-96c0-17dee0b72d4c"
```

Search logs for this ID to trace the complete request flow.

### Database Queries

Enable query logging in Supabase:
1. Go to Supabase Dashboard → Project Settings
2. Enable Query Performance Insights
3. Monitor slow queries and add indexes as needed

### LiveKit Debugging

Check room creation and connections:
- LiveKit Dashboard → Rooms
- Filter by booking ID or user email
- Monitor active participants and duration

## Common Issues

### Slots API returning empty
1. Check database connection: `POSTGRES_PRISMA_URL`
2. Seed test data: `npm run db:seed`
3. Verify indexes exist: `npx prisma db push`

### Admin not seeing real-time updates
1. Verify Supabase Realtime is enabled
2. Check browser console for subscription errors
3. Ensure admin token is valid

### LiveKit rooms not creating
1. Verify `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
2. Check LiveKit dashboard for active rooms
3. Test token generation manually

### Cron jobs not running
1. Set `CRON_SECRET` in Vercel env
2. Check Vercel Crons dashboard
3. Verify cron routes are accessible

## Deployment

See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

**Quick deploy to Vercel:**
```bash
git push origin main
# Vercel auto-deploys
```

## Support

For detailed architecture and implementation decisions, see:
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `DEPLOYMENT_GUIDE.md` - Production deployment checklist

For questions about specific components:
- Prisma: https://www.prisma.io/docs
- Supabase: https://supabase.com/docs
- LiveKit: https://docs.livekit.io
