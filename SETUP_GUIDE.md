# AstroKalki Setup Guide

## Environment Variables Required

### 1. Membership Pricing (Stripe)
```bash
STRIPE_PRICE_MONTHLY=price_xxx      # Stripe price ID for monthly membership (₹999)
STRIPE_PRICE_YEARLY=price_yyy       # Stripe price ID for yearly membership (₹9,999)
```

### 2. Bundle Session Pricing (Stripe)
```bash
STRIPE_PRICE_SINGLE_SESSION=price_aaa       # Single 60-min session (₹1,999)
STRIPE_PRICE_THREE_SESSION_PACK=price_bbb   # 3-session pack (₹4,999)
STRIPE_PRICE_FIVE_SESSION_PACK=price_ccc    # 5-session pack (₹7,499)
```

### 3. LiveKit Configuration
```bash
LIVEKIT_API_KEY=xxx
LIVEKIT_API_SECRET=yyy
LIVEKIT_URL=https://livekit.example.com
```

### 4. Supabase Configuration
```bash
SUPABASE_URL=https://xxx.supabase.co
POSTGRES_PRISMA_URL=postgresql://user:pass@host:port/db
POSTGRES_URL_NON_POOLING=postgresql://user:pass@host:port/db
```

## How to Create Stripe Products & Prices

1. **Log in to Stripe Dashboard**: https://dashboard.stripe.com
2. **Create Products** for each offering:
   - Monthly Membership (₹999/month)
   - Annual Membership (₹9,999/year)
   - Single Session (₹1,999 one-time)
   - 3-Session Pack (₹4,999, 90-day validity)
   - 5-Session Pack (₹7,499, 120-day validity)

3. **Copy Price IDs** and add to environment variables
4. **Set up Webhooks** in Stripe for:
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Troubleshooting

### "Membership pricing is not configured"
- Check `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY` are set
- Verify prices exist in Stripe Dashboard
- Restart dev server after adding env vars

### SEO Pages Generation Fails
- Check database connectivity
- Verify `POSTGRES_PRISMA_URL` is correct
- Run `npm run db:migrate` to ensure schema exists

### Case Studies Not Showing
- Case studies auto-seed on first load of /case-studies
- Check database logs for seed errors
- Manually verify `db.caseStudy.count()` in Prisma Studio

### LiveKit Room Creation Fails
- Verify `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` are set
- Test with: `curl -X POST https://livekit.example.com/api/rooms -H "Authorization: Bearer $TOKEN"`
- Check LiveKit console for rate limits or connection issues
