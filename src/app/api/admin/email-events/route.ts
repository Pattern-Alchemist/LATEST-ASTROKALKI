/**
 * GET /api/admin/email-events
 *
 * Returns aggregate email delivery metrics:
 *   - Total sent / delivered / opened / clicked / bounced
 *   - Per-template breakdown
 *   - Per-drip-sequence breakdown
 *
 * Query params:
 *   - from / to   ISO date strings for date-range filtering
 *   - template    filter by template slug
 *   - sequence    filter by drip sequence name
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const templateFilter = searchParams.get("template");
    const sequenceFilter = searchParams.get("sequence");

    // Date range
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;
    const hasDateFilter = from || to;

    // ─── Total Sent Emails ─────────────────────────────────────────
    const sentWhere: Record<string, unknown> = {};
    if (hasDateFilter) sentWhere.createdAt = dateFilter;
    if (templateFilter) sentWhere.template = templateFilter;
    if (sequenceFilter) sentWhere.sequence = sequenceFilter;

    const totalSent = await db.sentEmail.count({ where: sentWhere });

    // ─── Delivery status counts from SentEmail ─────────────────────
    const deliveredCount = await db.sentEmail.count({
      where: { ...sentWhere, deliveredAt: { not: null } },
    });
    const openedCount = await db.sentEmail.count({
      where: { ...sentWhere, openedAt: { not: null } },
    });
    const clickedCount = await db.sentEmail.count({
      where: { ...sentWhere, clickedAt: { not: null } },
    });
    const bouncedCount = await db.sentEmail.count({
      where: { ...sentWhere, bouncedAt: { not: null } },
    });

    // ─── Per-template breakdown ────────────────────────────────────
    const templateRows = await db.sentEmail.groupBy({
      by: ["template"],
      where: { ...sentWhere, template: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const templateBreakdown = templateRows.map((row) => ({
      template: row.template,
      sent: row._count.id,
    }));

    // ─── Per-sequence breakdown ────────────────────────────────────
    const sequenceRows = await db.sentEmail.groupBy({
      by: ["sequence", "stage"],
      where: { ...sentWhere, sequence: { not: null } },
      _count: { id: true },
      orderBy: [{ sequence: "asc" }, { stage: "asc" }],
    });

    const sequenceBreakdown = sequenceRows.map((row) => ({
      sequence: row.sequence,
      stage: row.stage,
      sent: row._count.id,
    }));

    // ─── Email events summary (from webhook events) ────────────────
    const eventWhere: Record<string, unknown> = {};
    if (hasDateFilter) eventWhere.createdAt = dateFilter;

    const eventTypeRows = await db.emailEvent.groupBy({
      by: ["type"],
      where: eventWhere,
      _count: { id: true },
    });

    const eventBreakdown = eventTypeRows.map((row) => ({
      type: row.type,
      count: row._count.id,
    }));

    // ─── Open rate / click rate ────────────────────────────────────
    const openRate = totalSent > 0 ? ((openedCount / totalSent) * 100).toFixed(1) : "0.0";
    const clickRate = totalSent > 0 ? ((clickedCount / totalSent) * 100).toFixed(1) : "0.0";
    const bounceRate = totalSent > 0 ? ((bouncedCount / totalSent) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      summary: {
        totalSent,
        delivered: deliveredCount,
        opened: openedCount,
        clicked: clickedCount,
        bounced: bouncedCount,
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`,
        bounceRate: `${bounceRate}%`,
      },
      byTemplate: templateBreakdown,
      bySequence: sequenceBreakdown,
      eventBreakdown,
    });
  } catch (err) {
    console.error("[AdminEmailEvents] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch email analytics" },
      { status: 500 }
    );
  }
}
