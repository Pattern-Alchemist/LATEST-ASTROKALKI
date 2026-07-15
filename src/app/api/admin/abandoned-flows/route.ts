import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "pending" | "recovered" | "converted"
    const flowType = searchParams.get("flowType") || "micro-reading";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { flowType };
    if (status === "pending") where.recovered = false;
    if (status === "recovered") where.recovered = true;
    if (status === "converted") where.converted = true;

    const [flows, total] = await Promise.all([
      db.abandonedFlow.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.abandonedFlow.count({ where }),
    ]);

    // Surface the most useful subset — don't leak full partialData blobs to
    // the table view. Send the parsed partial as a separate field.
    const enriched = flows.map((f) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(f.partialData);
      } catch {
        // ignore
      }
      return {
        ...f,
        parsed,
        partialData: undefined,
      };
    });

    return NextResponse.json({
      flows: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[admin/abandoned-flows] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
