/**
 * Birthday cron — runs daily, sends one annual birthday email to every
 * subscriber whose birthMonth matches the current month and who hasn't
 * received one this year.
 *
 * Production scheduling (daily at 09:00 IST = 03:30 UTC):
 *   30 3 * * *  curl -fsS "https://preview-0e79c0ab.space-z.ai/api/cron/birthday?key=$CRON_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBirthdayEmail } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.nextUrl.searchParams.get("key");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const stats = { sent: 0, skipped: 0, errors: 0 };

  try {
    // Birthday emails are session-related (they invite the recipient to book
    // their annual reading), so they respect the prefSessions preference.
    // Recipients must NOT have opted out AND must have prefSessions=true.
    const newsletterCandidates = await db.newsletter.findMany({
      where: {
        birthMonth: currentMonth,
        optedOut: false,
        prefSessions: true,
        OR: [
          { lastBirthdayYear: null },
          { lastBirthdayYear: { not: currentYear } },
        ],
      },
    });

    for (const sub of newsletterCandidates) {
      try {
        await sendBirthdayEmail(sub.email, sub.birthMonth!);
        await db.newsletter.update({
          where: { id: sub.id },
          data: { lastBirthdayYear: currentYear },
        });
        stats.sent++;
      } catch (err) {
        console.error(`[cron/birthday] Send failed for ${sub.email}:`, err);
        stats.errors++;
      }
    }

    const readingEmails = await db.microReading.findMany({
      where: { birthMonth: currentMonth },
      select: { email: true, birthMonth: true },
    });

    const newsletterEmails = new Set(
      newsletterCandidates.map((n) => n.email.toLowerCase())
    );

    const uniqueReadingEmails = Array.from(
      new Map(readingEmails.map((r) => [r.email.toLowerCase(), r])).values()
    );

    for (const reading of uniqueReadingEmails) {
      if (newsletterEmails.has((reading as any)?.email?.toLowerCase())) {
        stats.skipped++;
        continue;
      }

      let record = await db.newsletter.findUnique({
        where: { email: (reading as any)?.email },
      });

      if (record?.optedOut) {
        stats.skipped++;
        continue;
      }

      // Respect the session-emails preference. If the recipient has explicitly
      // muted session emails (prefSessions=false), skip them. New rows created
      // below default to prefSessions=true (schema default), so first-time
      // micro-reading recipients still receive the birthday email.
      if (record?.prefSessions === false) {
        stats.skipped++;
        continue;
      }

      if (record?.lastBirthdayYear === currentYear) {
        stats.skipped++;
        continue;
      }

      const readingData = reading as any;
      try {
        await sendBirthdayEmail(readingData.email, readingData.birthMonth);
        if (record) {
          await db.newsletter.update({
            where: { id: record.id },
            data: {
              birthMonth: readingData.birthMonth,
              lastBirthdayYear: currentYear,
            },
          });
        } else {
          await db.newsletter.create({
            data: {
              email: readingData.email,
              source: "micro-reading-birthday",
              birthMonth: readingData.birthMonth,
              lastBirthdayYear: currentYear,
              dripStage: 99,
            },
          });
        }
        stats.sent++;
      } catch (err) {
        console.error(
          `[cron/birthday] Reading-recipient send failed for ${readingData.email}:`,
          err
        );
        stats.errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      runAt: now.toISOString(),
      month: currentMonth,
      ...stats,
    });
  } catch (error) {
    console.error("[cron/birthday] Fatal:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
