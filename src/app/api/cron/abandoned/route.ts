/**
 * Abandoned-flow recovery cron — runs hourly.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendAbandonedRecoveryEmail } from "@/lib/email-templates";

const HOUR = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.nextUrl.searchParams.get("key");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 2 * HOUR);

  const stats = { recovered: 0, skipped: 0, errors: 0 };

  try {
    const candidates = await db.abandonedFlow.findMany({
      where: {
        recovered: false,
        converted: false,
        step: { gte: 1 },
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const seenEmails = new Set<string>();
    const toRecover = candidates.filter((c) => {
      const key = c.email.toLowerCase();
      if (seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    });

    for (const flow of toRecover) {
      let patternKey: string | null = null;
      try {
        const partial = JSON.parse(flow.partialData);
        patternKey = partial?.patterns?.[0] || partial?.pattern || null;
      } catch {
        // ignore parse failures
      }

      try {
        await sendAbandonedRecoveryEmail(flow.email, patternKey, flow.step);
        await db.abandonedFlow.update({
          where: { id: flow.id },
          data: { recovered: true, recoveredAt: now },
        });
        stats.recovered++;
      } catch (err) {
        console.error(
          `[cron/abandoned] Recovery send failed for ${flow.email}:`,
          err
        );
        stats.errors++;
      }
    }

    stats.skipped = candidates.length - toRecover.length;

    return NextResponse.json({
      ok: true,
      runAt: now.toISOString(),
      candidates: candidates.length,
      ...stats,
    });
  } catch (error) {
    console.error("[cron/abandoned] Fatal:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
