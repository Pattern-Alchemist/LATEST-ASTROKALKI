# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables Setup

Add the following environment variables to your Vercel project:

#### Supabase PostgreSQL (from integration)
```
POSTGRES_PRISMA_URL=postgresql://user:password@host:5432/dbname?schema=public
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:5432/dbname?schema=public
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### LiveKit
```
LIVEKIT_API_KEY=APIxxxxxx
LIVEKIT_API_SECRET=secret-xxxxxx
LIVEKIT_URL=https://livekit.example.com
```

#### Security
```
ADMIN_SECRET=<generate-secure-random-string>
CRON_SECRET=<generate-secure-random-string>
```

#### Existing Services
```
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

### 2. Database Setup

The Prisma migrations have already been created. On first deployment, Vercel will automatically run migrations via the `prisma migrate deploy` command in the build step.

**Manual Migration (if needed):**
```bash
npm run db:migrate:deploy
```

**Seed Database (optional - for testing):**
```bash
npm run db:seed
```

### 3. Supabase Configuration

#### Connection Pooling
1. Go to Supabase Dashboard → Project Settings → Database
2. Enable PgBouncer under "Connection pooling"
3. Copy the "Pooler mode" connection string to `POSTGRES_PRISMA_URL`
4. Use the direct connection for `POSTGRES_URL_NON_POOLING`

#### Row-Level Security (RLS)
The app uses role-based access. To enable full RLS:

```sql
-- Users can see only their own bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_bookings" 
  ON bookings FOR ALL 
  USING (auth.uid()::text = email);

-- Admins can see all (configure via JWT claims)
CREATE POLICY "admins_see_all_bookings"
  ON bookings FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');
```

### 4. LiveKit Setup

1. Create a LiveKit account at https://cloud.livekit.io
2. Create a project and get API credentials
3. Generate API key and secret
4. Get the URL for your LiveKit deployment
5. Add to Vercel environment variables

### 5. Admin Authentication

The admin routes are protected by `ADMIN_SECRET`. 

**To access admin endpoints:**
```bash
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  https://yourdomain.com/api/admin/bookings
```

**Integrate with your auth system:**
Update `middleware.ts` to use your existing auth provider (NextAuth, Clerk, etc.).

---

## Deployment Steps

### Step 1: Connect to Vercel

If not already connected, link this repository to Vercel:
```bash
vercel link
```

### Step 2: Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:
- Add all variables from the checklist above
- Ensure they're available in all environments (Production, Preview, Development)

### Step 3: Deploy

Push to your connected branch:
```bash
git push origin v0/kausavlifes-4132-426544a5
```

Or deploy manually:
```bash
vercel deploy --prod
```

### Step 4: Verify Build

Monitor the Vercel deployment logs:
```
✓ Build complete
✓ Prisma migrations applied
✓ Ready to serve
```

### Step 5: Test APIs

**Test Slots API:**
```bash
curl https://yourdomain.com/api/slots?duration=60&limit=5
```

**Test Admin Bookings:**
```bash
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  https://yourdomain.com/api/admin/bookings?limit=10
```

**Test Cron Jobs (manual trigger):**
```bash
# Cleanup old rooms
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://yourdomain.com/api/cron/cleanup-rooms

# Send reminders
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://yourdomain.com/api/cron/send-reminders
```

---

## Monitoring & Debugging

### 1. View Logs

In Vercel Dashboard → Deployments → Select deployment → Logs:
- Look for correlation IDs in logs (e.g., `requestId: "f5c263fe..."`)
- Search for error messages and stack traces

### 2. Check Cron Job Execution

In Vercel Dashboard → Crons:
- Verify scheduled jobs are running hourly
- Check the last execution status
- View execution logs

### 3. Database Performance

In Supabase Dashboard → Database:
- Check connection pooling metrics
- Monitor query performance
- Review slow query logs

### 4. LiveKit Rooms

Monitor active rooms and connections:
```bash
# If using LiveKit CLI
livekit inspect rooms
```

---

## Scaling Considerations

### 1. Connection Pooling

Currently configured with PgBouncer:
- Pooler mode: `transaction` (default, good for Vercel)
- Connection limit: adjust if needed in Supabase settings

### 2. Caching

Slots API uses cache headers:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

This caches at Vercel Edge for 60s with 5-minute stale content fallback.

### 3. Rate Limiting

Current setup uses in-memory rate limits. For production:
- Consider Upstash Redis for distributed rate limiting
- Update `middleware.ts` to use Redis adapter

### 4. Database Indexes

All critical queries are indexed:
- `AvailabilitySlot(start, status)` - for slot lookups
- `Booking(createdAt, status)` - for booking queries
- `Booking(email)` - for user lookups

Monitor index usage in Supabase.

---

## Rollback Strategy

If deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback in Vercel Dashboard
# → Settings → Git → Automatic deployments → disable
```

To rollback Prisma migrations:
```bash
npm run db:migrate:resolve -- --rolled-back  # Mark failed migration as rolled back
npm run db:migrate:deploy  # Re-apply
```

---

## Post-Deployment Tasks

### 1. Create Test Bookings
- Navigate to booking form
- Complete a test booking
- Verify email/WhatsApp confirmation sent

### 2. Test Admin Dashboard
- Log in as admin
- View real-time booking list
- Test filtering and search

### 3. Test LiveKit Integration
- Confirm a booking
- Verify room created in LiveKit
- Test joining as user and admin

### 4. Test Cron Jobs
- Manually trigger cleanup job
- Check room cleanup
- Trigger reminder job

### 5. Set Up Monitoring
- Add Sentry for error tracking (optional)
- Configure alerts for failing cron jobs
- Set up Supabase database alerts

---

## Troubleshooting

### Slots API returning empty or timing out

**Possible causes:**
1. Database connection timeout - check `POSTGRES_PRISMA_URL`
2. Indexes not created - run `npx prisma db push`
3. No slots in database - create test data

**Fix:**
```bash
# Force index creation
npx prisma db push --force-reset

# Seed database
npm run db:seed
```

### Admin routes returning 401 Unauthorized

**Check:**
1. `ADMIN_SECRET` is set correctly
2. Authorization header is being sent
3. Update `middleware.ts` to match your auth provider

### LiveKit rooms not created

**Check:**
1. `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` are set
2. LiveKit project is active and accessible
3. Check API logs in LiveKit dashboard

### Cron jobs not running

**Check:**
1. `CRON_SECRET` is set in Vercel env
2. Routes are accessible via POST with auth header
3. Check Vercel Crons dashboard for errors
4. Verify timezone in cron schedule

---

## Performance Optimization

### 1. Reduce Cold Start Time

- Keep dependencies minimal
- Use `@vercel/og` for image generation (not GenerateImage tool)
- Enable Turbopack in `next.config.js`

### 2. Optimize Queries

Current slots query should be < 100ms:
```bash
# Monitor with correlation IDs
curl https://yourdomain.com/api/slots?duration=60 | jq '.requestId'
# Search logs for this requestId to see query duration
```

### 3. Use Redis Cache (Optional)

For heavily-used endpoints, add Upstash Redis:
```bash
npm install @upstash/redis
```

Update `lib/slots-service.ts` to cache results:
```typescript
const cached = await redis.get(`slots:${duration}:${startDate}`);
if (cached) return cached;
// ... fetch from DB
redis.setex(`slots:${duration}:${startDate}`, 300, slots);
```

---

## Support & Documentation

- Prisma: https://www.prisma.io/docs
- Supabase: https://supabase.com/docs
- LiveKit: https://docs.livekit.io
- Vercel: https://vercel.com/docs
- Next.js: https://nextjs.org/docs

For issues, check IMPLEMENTATION_SUMMARY.md for architecture details.
