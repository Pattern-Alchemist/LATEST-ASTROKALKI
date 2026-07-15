import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * CSV export for admin — supports:
 *   /api/admin/export?type=newsletter
 *   /api/admin/export?type=micro-readings
 *   /api/admin/export?type=bookings
 *   /api/admin/export?type=abandoned
 *   /api/admin/export?type=referrals
 *
 * Returns a CSV file with appropriate headers. Used by the admin dashboard's
 * "Export CSV" buttons.
 */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape per RFC 4180: wrap in quotes if it contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const headerLine = headers.map((h) => csvEscape(h.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => csvEscape(row[h.key])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type") || "newsletter";
    const limit = 10000;

    let csv = "";
    let filename = "";

    if (type === "newsletter") {
      const rows = await db.newsletter.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      csv = toCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          lastDripAt: r.lastDripAt?.toISOString() || "",
          optedOutAt: r.optedOutAt?.toISOString() || "",
        })),
        [
          { key: "email", label: "Email" },
          { key: "source", label: "Source" },
          { key: "birthMonth", label: "Birth Month" },
          { key: "dripStage", label: "Drip Stage" },
          { key: "lastDripAt", label: "Last Drip At" },
          { key: "optedOut", label: "Opted Out" },
          { key: "createdAt", label: "Subscribed At" },
        ]
      );
      filename = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "micro-readings") {
      const rows = await db.microReading.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      csv = toCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          emailSentAt: r.emailSentAt?.toISOString() || "",
        })),
        [
          { key: "email", label: "Email" },
          { key: "birthMonth", label: "Birth Month" },
          { key: "emotionalPattern", label: "Pattern" },
          { key: "relationshipFrustration", label: "Frustration" },
          { key: "resultHint", label: "Result Hint" },
          { key: "emailSentAt", label: "Email Sent At" },
          { key: "createdAt", label: "Created At" },
        ]
      );
      filename = `micro-readings-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "bookings") {
      const rows = await db.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      csv = toCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        [
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "duration", label: "Duration (min)" },
          { key: "price", label: "Price" },
          { key: "birthDate", label: "Birth Date" },
          { key: "birthTime", label: "Birth Time" },
          { key: "birthPlace", label: "Birth Place" },
          { key: "contexts", label: "Contexts" },
          { key: "message", label: "Message" },
          { key: "referredBy", label: "Referred By" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Created At" },
        ]
      );
      filename = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "abandoned") {
      const rows = await db.abandonedFlow.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      csv = toCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          recoveredAt: r.recoveredAt?.toISOString() || "",
        })),
        [
          { key: "email", label: "Email" },
          { key: "flowType", label: "Flow" },
          { key: "step", label: "Step Reached" },
          { key: "partialData", label: "Partial Data" },
          { key: "recovered", label: "Recovery Email Sent" },
          { key: "recoveredAt", label: "Recovery Sent At" },
          { key: "converted", label: "Converted (Came Back)" },
          { key: "createdAt", label: "Started At" },
        ]
      );
      filename = `abandoned-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "referrals") {
      // Each row is one ReferralUse, joined to its Referral. This gives the
      // publisher the per-attribution view: who referred whom, when.
      const refs = await db.referral.findMany({
        orderBy: [{ uses: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: {
          referralUses: {
            orderBy: { createdAt: "desc" },
            select: { email: true, name: true, createdAt: true },
          },
        },
      });
      const rows: Record<string, unknown>[] = [];
      for (const r of refs) {
        if (r.referralUses.length === 0) {
          rows.push({
            code: r.code,
            referrerName: r.referrerName,
            referrerEmail: r.referrerEmail,
            totalUses: r.uses,
            referredEmail: "",
            referredName: "",
            usedAt: "",
            referralCreatedAt: r.createdAt.toISOString(),
            lastUsedAt: r.lastUsedAt?.toISOString() || "",
          });
        } else {
          for (const use of r.referralUses) {
            rows.push({
              code: r.code,
              referrerName: r.referrerName,
              referrerEmail: r.referrerEmail,
              totalUses: r.uses,
              referredEmail: use.email,
              referredName: use.name || "",
              usedAt: use.createdAt.toISOString(),
              referralCreatedAt: r.createdAt.toISOString(),
              lastUsedAt: r.lastUsedAt?.toISOString() || "",
            });
          }
        }
      }
      csv = toCsv(rows, [
        { key: "code", label: "Code" },
        { key: "referrerName", label: "Referrer Name" },
        { key: "referrerEmail", label: "Referrer Email" },
        { key: "totalUses", label: "Total Uses" },
        { key: "referredEmail", label: "Referred Email" },
        { key: "referredName", label: "Referred Name" },
        { key: "usedAt", label: "Used At" },
        { key: "referralCreatedAt", label: "Referral Created At" },
        { key: "lastUsedAt", label: "Last Used At" },
      ]);
      filename = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[admin/export] Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
