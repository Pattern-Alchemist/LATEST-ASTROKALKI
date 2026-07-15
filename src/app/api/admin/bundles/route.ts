/**
 * GET /api/admin/bundles — List all bundle products and purchases
 * POST /api/admin/bundles — Create or update a bundle product
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const products = await db.bundleProduct.findMany({
      include: {
        _count: { select: { purchases: true } },
        purchases: {
          select: { status: true, remainingSessions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const purchases = await db.bundlePurchase.findMany({
      include: {
        bundleProduct: { select: { slug: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ products, purchases });
  } catch (err) {
    console.error("[AdminBundles] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bundles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 4 * 1024) {
        return NextResponse.json({ error: "Body too large" }, { status: 413 });
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { slug, title, description, sessionCount, validityDays, stripePriceId } =
      body as Record<string, string | number>;

    if (!slug || !title || !sessionCount) {
      return NextResponse.json(
        { error: "slug, title, and sessionCount are required" },
        { status: 400 }
      );
    }

    const product = await db.bundleProduct.upsert({
      where: { slug: String(slug) },
      create: {
        slug: String(slug),
        title: String(title),
        description: description ? String(description) : null,
        sessionCount: Number(sessionCount),
        validityDays: validityDays ? Number(validityDays) : null,
        stripePriceId: stripePriceId ? String(stripePriceId) : null,
      },
      update: {
        title: String(title),
        description: description ? String(description) : null,
        sessionCount: Number(sessionCount),
        validityDays: validityDays ? Number(validityDays) : null,
        stripePriceId: stripePriceId ? String(stripePriceId) : null,
      },
    });

    return NextResponse.json({ product });
  } catch (err) {
    console.error("[AdminBundles] POST error:", err);
    return NextResponse.json(
      { error: "Failed to save bundle product" },
      { status: 500 }
    );
  }
}
