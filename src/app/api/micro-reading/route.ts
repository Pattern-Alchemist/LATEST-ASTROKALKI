import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, notifyAdmin } from "@/lib/email";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  microReadingInputSchema,
  isHoneypotTriggered,
  honeypotSuccessResponse,
} from "@/lib/security";

// Full descriptions for the email body — mirrors what users see on screen,
// expanded with the kind of psychological specificity the brand voice demands.
const patternFullText: Record<string, { title: string; body: string }> = {
  abandonment: {
    title: "The Abandonment Loop",
    body: `You leave before they can leave you. Or you stay too long, because leaving feels like the original wound happening again. Either way, the pattern is older than the person you're with — it was set in the first house, the first bond, the first time someone you needed wasn't there.

The pattern isn't a flaw in your love. It's a survival reflex that grew into a personality. Recognising it isn't healing it — but it is the moment the loop stops being invisible.`,
  },
  control: {
    title: "The Control Architecture",
    body: `You don't control because you want power. You control because the alternative — uncertainty, surprise, the ground shifting under you — once felt like the end of the world. So you built structures. Lists. Plans. Exit strategies.

The architecture is impressive. It's also the reason intimacy can't get in. Control and connection can't occupy the same room. One always asks the other to leave.`,
  },
  "people-pleasing": {
    title: "The Chameleon Pattern",
    body: `You read the room before you read yourself. You adjust. You soften. You become what's needed. It's a kind of intelligence — but it's also how you lost the shape of your own wants.

The pattern started where disagreement felt unsafe. Now it runs on autopilot. The work isn't learning to be kind — you already are. It's learning to stay when someone is disappointed in you, without dissolving.`,
  },
  "emotional-numbness": {
    title: "The Deep Freeze",
    body: `You don't feel nothing. You feel everything — and then a layer of frost forms over it. Long ago, feeling became too expensive. So you learned to function on top of it.

The pattern protects you. It also keeps you out of your own life. The thaw is not dramatic. It comes back in small moments — a song, a smell, a sentence — and the work is letting those moments land without shutting them down.`,
  },
  overthinking: {
    title: "The Mental Labyrinth",
    body: `You think because thinking once kept you safe. If you could predict it, you could survive it. So you rehearse, you analyse, you turn every conversation into a case file.

But the labyrinth has no exit, because the exit isn't an answer. It's a decision. The pattern is the belief that if you think long enough, you won't have to choose — the answer will simply arrive. It won't. Clarity comes after the step, not before it.`,
  },
  "self-doubt": {
    title: "The Erosion Pattern",
    body: `You don't lack confidence. You have confidence — and then you have the second voice that immediately erodes it. By the time you act, you've already lost the version of yourself that was about to act.

The pattern is fog, not weakness. It lifts when you stop trying to think your way out of it and start acting your way out of it. Small actions, taken before the fog has time to thicken, are how the erosion reverses.`,
  },
};

const hints: Record<string, string> = {
  abandonment: "The Abandonment Loop — 4th/7th house wound",
  control: "The Control Architecture — Saturn influence",
  "people-pleasing": "The Chameleon Pattern — Venus placement",
  "emotional-numbness": "The Deep Freeze — Moon-Saturn aspect",
  overthinking: "The Mental Labyrinth — Mercury dominance",
  "self-doubt": "The Erosion Pattern — Neptune's fog",
};

export async function POST(request: NextRequest) {
  // Rate limit — 10 micro-readings per IP per hour
  const ip = getClientIp(request);
  const rl = checkRateLimit(`mr:${ip}`, RATE_LIMITS.microReading);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body with size cap (4 KB)
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: "Body too large" }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — silently succeed for bots
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      honeypotSuccessResponse('micro-reading'),
      { status: 200 }
    );
  }

  // Validate
  const parsed = validateInput(microReadingInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { email, month, patterns, frustration } = parsed.data;

  try {
    // Map month name to number
    const monthMap: Record<string, number> = {
      January: 1, February: 2, March: 3, April: 4,
      May: 5, June: 6, July: 7, August: 8,
      September: 9, October: 10, November: 11, December: 12,
    };

    const birthMonth = monthMap[month] || 1;
    const emotionalPattern = Array.isArray(patterns) ? patterns[0] : patterns;

    const resultHint = hints[emotionalPattern] || "Pattern identified — chart decode recommended";

    // Save to database
    await db.microReading.create({
      data: {
        email,
        birthMonth,
        emotionalPattern,
        relationshipFrustration: frustration,
        resultHint,
        emailSentAt: new Date(),
        enrolledFromReading: true,
      },
    });

    // Enroll the user into the newsletter drip if they aren't already,
    // and tag them with their birth month (used by the birthday cron).
    // This is how a micro-reading becomes a long-term nurture relationship.
    const existingSub = await db.newsletter.findUnique({ where: { email } });
    if (!existingSub) {
      await db.newsletter.create({
        data: {
          email,
          source: 'micro-reading',
          birthMonth,
          // Start drip clock at the welcome stage (the reading email itself
          // acts as the welcome). Cron will send Day +2 in 48h.
          lastDripAt: new Date(),
        },
      });
    } else if (!existingSub.birthMonth) {
      // Backfill birth month if they were subscribed before giving it.
      await db.newsletter.update({
        where: { id: existingSub.id },
        data: { birthMonth },
      });
    }

    // Also: any AbandonedFlow records for this email should be marked
    // converted — they finished the flow.
    await db.abandonedFlow.updateMany({
      where: { email, converted: false },
      data: { converted: true },
    });

    // Dispatch the actual reading email — this is what the UI promises with
    // "Enter your email to read the truth." Previously the email was never sent.
    const full = patternFullText[emotionalPattern];
    if (full) {
      await Promise.allSettled([
        sendEmail({
          to: email,
          subject: `Your pattern: ${full.title}`,
          text: [
            `${full.title}`,
            ``,
            `${full.body}`,
            ``,
            `— — —`,
            ``,
            `This is a fragment. The full decode requires your chart, your timing, and a conversation.`,
            ``,
            `Book the full decode: https://preview-0e79c0ab.space-z.ai/#booking`,
            ``,
            `We respect your inbox. Unsubscribe anytime.`,
            ``,
            `— AstroKalki`,
          ].join("\n"),
          html: `
            <div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:48px 24px;max-width:560px;margin:0 auto;">
              <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">Your pattern</p>
              <h1 style="font-size:32px;font-weight:300;letter-spacing:-0.02em;line-height:1.15;margin:0 0 32px;">${full.title}</h1>
              <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;white-space:pre-wrap;">${full.body}</p>
              <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0;"/>
              <p style="font-size:13px;line-height:1.8;color:#7a7a7a;font-weight:300;">
                This is a fragment. The full decode requires your chart, your timing, and a conversation.
              </p>
              <p style="margin-top:24px;">
                <a href="https://preview-0e79c0ab.space-z.ai/#booking" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Book the full decode →</a>
              </p>
              <p style="font-size:12px;color:#5a5a5a;margin-top:40px;font-weight:300;">We respect your inbox. Unsubscribe anytime.</p>
              <p style="font-size:13px;color:#a58a54;margin-top:16px;font-style:italic;">— AstroKalki</p>
            </div>
          `,
        }),
        notifyAdmin({
          subject: `[AstroKalki] New micro-reading — ${full.title}`,
          text: [
            `New micro-reading captured.`,
            ``,
            `Email: ${email}`,
            `Birth month: ${month}`,
            `Primary pattern: ${emotionalPattern} (${full.title})`,
            `Frustration key: ${frustration}`,
          ].join("\n"),
          html: `
            <p>New micro-reading captured.</p>
            <p><strong>Email:</strong> ${email}<br/>
            <strong>Birth month:</strong> ${month}<br/>
            <strong>Primary pattern:</strong> ${emotionalPattern} (${full.title})<br/>
            <strong>Frustration key:</strong> ${frustration}</p>
          `,
        }),
      ]);
    }

    return NextResponse.json({ success: true, hint: resultHint });
  } catch (error) {
    console.error("Micro-reading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
