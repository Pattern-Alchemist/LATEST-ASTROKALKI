# Admin Guide — AstroKalki

## SEO Page Generation (Programmatic)

### Overview
Generate 220 SEO landing pages automatically: 10 astrological patterns × 20 major Indian cities = 220 indexed pages for programmatic SEO.

### How to Generate Pages

1. **Full Generation** (generates all 220 pages):
```bash
curl -X POST http://localhost:3000/api/admin/seo/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

2. **Generate for Specific Pattern**:
```bash
curl -X POST http://localhost:3000/api/admin/seo/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "shadow-side-relationships"}'
```

3. **Generate for Specific City**:
```bash
curl -X POST http://localhost:3000/api/admin/seo/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"city": "bangalore"}'
```

4. **Force Regenerate (refresh existing pages)**:
```bash
curl -X POST http://localhost:3000/api/admin/seo/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Response Format
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 220,
    "created": 150,
    "updated": 40,
    "skipped": 30,
    "coverage": 86.36
  },
  "resultCount": 220,
  "message": "Generated 190 pages. 30 already exist or skipped."
}
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unexpected end of JSON input" | Check request body is valid JSON. See SETUP_GUIDE.md for required env vars. |
| "Failed to create page" | Verify database connection. Run `npm run db:migrate` |
| 0 pages generated | Check if pages already exist. Use `force: true` to regenerate. |
| Slow generation | Generation is sequential by design. 220 pages ≈ 30 seconds total. |

---

## Case Studies Seeding

### How It Works
Case studies auto-seed on first visit to `/case-studies`. Three anonymized client journeys are created automatically.

### Manual Trigger
```bash
curl http://localhost:3000/case-studies
```
Check logs for: `[case-studies] Seeded 3 initial case studies`

### Verify Seeding
```bash
npm run db:push  # ensure schema exists
# Then visit /case-studies in browser
```

### Create New Case Study
Use `/admin/case-studies` to create custom case studies:
- Write title, pattern, client initials, age
- Describe: Problem → Pattern → Session → Shift
- Get explicit consent before publishing

---

## Membership & Pricing Setup

### Create Stripe Products

1. Go to **Stripe Dashboard** → Products
2. Create 5 products:
   - **Monthly Membership** (₹999)
   - **Annual Membership** (₹9,999)
   - **Single Session** (₹1,999)
   - **3-Session Pack** (₹4,999, 90-day validity)
   - **5-Session Pack** (₹7,499, 120-day validity)

3. Copy the **Price IDs** and add to `.env`:
```bash
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_YEARLY=price_yyy
STRIPE_PRICE_SINGLE_SESSION=price_aaa
STRIPE_PRICE_THREE_SESSION_PACK=price_bbb
STRIPE_PRICE_FIVE_SESSION_PACK=price_ccc
```

4. Test at `/membership` page

---

## LiveKit Video Calls

### Configuration
Set these environment variables:
```bash
LIVEKIT_API_KEY=xxx
LIVEKIT_API_SECRET=yyy
LIVEKIT_URL=https://livekit.example.com
NEXT_PUBLIC_LIVEKIT_URL=https://livekit.example.com
```

### Test Video Room
```bash
# This creates a test room
curl -X POST http://localhost:3000/api/livekit/create-room \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "test-123", "userName": "Test User"}'
```

### View LiveKit Console
- https://cloud.livekit.io/ (if using Cloud)
- Check active rooms and participants
- Monitor connection quality

---

## Real-Time Booking Status

### Update Status
Use the admin panel at `/admin` to:
- View all bookings in real-time
- Change status: pending → confirmed → completed → cancelled
- Send reminders (24h before session)
- Mark sessions as recorded

### Auto-Status Updates
Cron jobs run hourly:
- `/api/cron/send-reminders` — emails 24h before session
- `/api/cron/cleanup-rooms` — deletes LiveKit rooms 1h after session end

