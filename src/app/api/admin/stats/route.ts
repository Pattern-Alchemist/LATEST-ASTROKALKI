import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      totalNewsletter,
      totalMicroReadings,
      totalReferrals,
      totalMemberships,
      totalTestimonials,
      totalInsights,
    ] = await Promise.all([
      db.booking.count(),
      db.booking.count({ where: { status: 'pending' } }),
      db.booking.count({ where: { status: 'confirmed' } }),
      db.booking.count({ where: { status: 'completed' } }),
      db.booking.count({ where: { status: 'cancelled' } }),
      db.newsletter.count(),
      db.microReading.count(),
      db.referral.count(),
      db.membership.count({ where: { status: 'active' } }),
      db.testimonial.count(),
      db.insight.count({ where: { published: true } }),
    ]);

    // Calculate total revenue from completed/confirmed bookings
    const revenueBookings = await db.booking.findMany({
      where: { status: { in: ['completed', 'confirmed'] } },
      select: { price: true },
    });

    const totalRevenue = revenueBookings.reduce((sum, b) => {
      const num = parseFloat(b.price.replace(/[^0-9.]/g, ''));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    // Recent bookings (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentBookings = await db.booking.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // Recent newsletter signups (last 7 days)
    const recentNewsletter = await db.newsletter.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    return NextResponse.json({
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      totalNewsletter,
      totalMicroReadings,
      totalReferrals,
      totalMemberships,
      totalTestimonials,
      totalInsights,
      totalRevenue,
      recentBookings,
      recentNewsletter,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
