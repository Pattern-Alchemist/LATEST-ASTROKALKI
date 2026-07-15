import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * /api/admin/slots/[id]
 *
 * Gated by middleware — admin session required.
 *
 * PATCH  — Update a slot. Supports:
 *            { status: 'open' | 'held' | 'booked' }
 *            { start: ISO, end: ISO }  (reschedule)
 *          Constraints:
 *            - Can't delete the link to a booked slot via PATCH (use the
 *              booking's own admin endpoint for that).
 *            - If you change status to 'booked' or 'held', you must also
 *              pass bookingId (only 'booked' actually requires it).
 *
 * DELETE — Delete a slot, but only if status='open'. Booked slots must
 *          be cancelled through the booking flow (which sets the slot
 *          back to 'open' via cascade or manual admin action).
 */

const patchSchema = z
  .object({
    status: z.enum(['open', 'held', 'booked']).optional(),
    start: z.string().min(1).optional(),
    end: z.string().min(1).optional(),
    bookingId: z.string().min(1).nullable().optional(),
  })
  .refine((d) => d.status || d.start || d.end || d.bookingId !== undefined, {
    message: 'Nothing to update',
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return NextResponse.json(
        { error: issues[0] || 'Invalid input', issues },
        { status: 400 }
      );
    }

    const existing = await db.availabilitySlot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    const data: {
      status?: 'open' | 'held' | 'booked';
      start?: Date;
      end?: Date;
      bookingId?: string | null;
    } = {};

    if (parsed.data.status) data.status = parsed.data.status;
    if (parsed.data.start) {
      const s = new Date(parsed.data.start);
      if (isNaN(s.getTime())) {
        return NextResponse.json({ error: 'start must be a valid ISO date' }, { status: 400 });
      }
      data.start = s;
    }
    if (parsed.data.end) {
      const e = new Date(parsed.data.end);
      if (isNaN(e.getTime())) {
        return NextResponse.json({ error: 'end must be a valid ISO date' }, { status: 400 });
      }
      data.end = e;
    }
    if (parsed.data.bookingId !== undefined) {
      data.bookingId = parsed.data.bookingId;
    }

    // Consistency: if marking as 'booked', require a bookingId.
    if (data.status === 'booked' && !data.bookingId && !existing.bookingId) {
      return NextResponse.json(
        { error: 'Cannot mark slot as booked without linking a booking.' },
        { status: 400 }
      );
    }

    // Consistency: if releasing a booked slot back to open, clear the link.
    if (data.status === 'open' && existing.status === 'booked') {
      data.bookingId = null;
    }

    const slot = await db.availabilitySlot.update({
      where: { id },
      data,
    });

    return NextResponse.json({ slot });
  } catch (error) {
    console.error('Admin slot patch error:', error);
    return NextResponse.json(
      { error: 'Failed to update slot' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.availabilitySlot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }
    if (existing.status !== 'open') {
      return NextResponse.json(
        {
          error: `Cannot delete a slot with status '${existing.status}'. Only open slots can be deleted.`,
        },
        { status: 409 }
      );
    }

    await db.availabilitySlot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin slot delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete slot' },
      { status: 500 }
    );
  }
}
