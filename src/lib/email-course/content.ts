/**
 * Pattern Recognition Foundations — the 5-day email course.
 *
 * Voice rules (match the rest of the AstroKalki writing):
 *  - Second-person ("you"), never first-person plural ("we")
 *  - Psychologically precise, not mystical
 *  - Banned words: karmic, cosmic, destiny, reveal, unlock, hidden wisdom
 *  - Each email ends with a "Tomorrow:" teaser + a reflective question
 *  - One soft CTA per email — book a session — never multiple CTAs
 *
 * Each email body is markdown (handled by ./render.ts).
 * Target length: 800–1200 words of body per email.
 */

export interface CourseEmail {
  /** Day number, 1–5 */
  day: number;
  /** Email subject line */
  subject: string;
  /** Preheader (preview text shown after the subject in most inboxes) */
  preheader: string;
  /** Body in markdown — rendered to HTML + plain text by ./render.ts */
  body: string;
  /** CTA button label */
  ctaText: string;
  /** CTA destination URL (absolute — emails need a real host) */
  ctaUrl: string;
}

const BOOKING_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://astrokalki.com";

const bookSessionUrl = `${BOOKING_URL}/#booking`;

export const COURSE_EMAILS: CourseEmail[] = [
  {
    day: 1,
    subject: "What is a pattern?",
    preheader: "And why the same pain keeps showing up with a different face.",
    ctaText: "Book a session",
    ctaUrl: bookSessionUrl,
    body: `# What is a pattern?

You signed up because something feels repeated.

The same argument, in a different kitchen. The same kind of person on the other side of the table. The same shape of disappointment, dressed up in new clothes. The same exit you keep walking toward, just through different doors.

Most people call this bad luck. A streak. Fate, if they're feeling philosophical. None of those words help. They describe the surface without ever touching what's underneath.

Here's the working definition we'll use for the next five days:

*A pattern is a stance you took, once, to survive something — and kept taking long after the thing you were surviving was over.*

That's it. Not a curse. Not a verdict. A stance. The first time you took it, it worked. It kept you safe, kept you fed, kept you loved, kept you invisible, kept you alive. The nervous system noticed. It filed the stance under "things that work." And the next time the world felt even a little like that first time, the stance came back automatically.

This is the engine. Not prediction. **Recognition.**

## The chart is not a forecast

A lot of people come to this work expecting a forecast. They want to know what's going to happen. When they'll meet someone. Whether this job is the right one. Whether the hard part is almost over.

That's not what the chart does in this practice.

The chart is a diagnostic. It tells you which stances your particular history has made probable. Which rooms you're likely to walk into already bracing. Which conversations you're likely to enter already apologizing. Which exits you've trained yourself to look for before you've even sat down.

A weather forecast tells you what the day will be. A diagnostic tells you what's already operating. Pattern work is diagnostic. We're not reading the future. We're reading the posture you've been holding so long you forgot it was a posture.

## The test for whether it's a pattern

There's a simple test. Ask yourself:

*Does the shape stay the same when the people change?*

The partner was different. The boss was different. The friend group was different. The city was different. But the shape — the way you feel at the end, the thing you swore you'd never do again, the morning after — stayed the same.

That's a pattern. The faces rotate. The architecture doesn't.

This is hard to see from inside it, because patterns don't feel like patterns. They feel like the world. They feel like personality. They feel like "just the way I am." They feel like other people — what they did to you, what they didn't give you, how they let you down.

The whole genius of a pattern is that it makes itself invisible. It presents as the situation, not as your contribution to the situation.

So the first move in this work is not to fix anything. The first move is to see the stance.

## A small exercise

Three times today, pause and ask yourself: *what stance am I taking right now?*

Not why. Not what you should do instead. Just — what stance is this?

You might notice your shoulders are up around your ears. That's bracing. You might notice your voice has gone one note brighter than you actually feel. That's performing ease. You might notice you're already rehearsing what you'll say back. That's preparing to defend. You might notice you've agreed to something you don't want to do and you're already planning how to make it work. That's self-abandonment. We'll get to all of these.

You don't have to do anything with the noticing yet. Just notice. The naming comes later. Today is just the muscle of catching the stance in real time.

Most people who try this for the first time are surprised by how often the answer is the same. The same three or four stances, rotating through the day. Bracing. Managing. Deflecting. Performing competence. Apologizing for space you're not even taking up yet.

That's your pattern vocabulary. The rest of this course is about naming the most common ones — the ones that show up across thousands of readings — so you have language for what you're already doing.

## What naming does (and doesn't) do

Naming a pattern doesn't fix it. Let's be clear about that up front. You can name the abandonment loop on a Tuesday and still find yourself standing in it on Friday. Naming is not the cure.

But naming is the move that makes the cure possible. Because once you can see the stance, you can ask the only question that matters:

*Is this stance still serving me — or am I still serving it?*

Most of the time, by the time you're asking, the answer is already the second one. And that gap — the gap between the stance you took to survive and the stance that's now surviving off you — is where the actual work lives.

That's what we'll be doing for the next four days. Walking into the gap.

---

**Tomorrow:** the abandonment loop — the most common pattern AstroKalki sees, and the one almost everyone carries a version of. We'll trace it from where it starts to how it shows up in your relationships today.

Before then, one question to sit with:

*Which conversation this week did you walk into already bracing? Whose face were you actually bracing against — the person in front of you, or someone from a long time ago?*

If you want to look at this more closely with someone trained to read the stance — book a session. There's no rush. The course is free, and it stands on its own.`,
  },

  {
    day: 2,
    subject: "The abandonment loop",
    preheader: "The most common pattern. And the first step to seeing it.",
    ctaText: "Book a session",
    ctaUrl: bookSessionUrl,
    body: `# The abandonment loop

Of all the patterns AstroKalki sees in readings, this is the most common. Not because people are broken — because the conditions that build it are ordinary.

The abandonment loop doesn't require catastrophe. It doesn't require overt neglect or cruelty. It just requires a caregiver who, for some stretch of time that mattered, wasn't quite there. A parent who was grieving. A parent who was working three jobs. A parent who was physically present and emotionally elsewhere. A parent who loved you and was also, in the moments you needed them most, looking at something else.

That's enough. That's all it takes.

Here's how the loop forms.

A child needs attention. The child reaches. The caregiver can't meet it — not because they don't love the child, but because they are stretched, or distracted, or in their own pain. The child feels the not-meeting. It's unbearable. So the child does the only thing a small nervous system can do to make it bearable: they decide the reaching was the problem.

*If I don't reach, I won't feel the not-meeting.*

This is the original stance. And it works. The pain drops. The child adapts. The caregiver, relieved of the demand, becomes more available — or at least less frayed. The loop is reinforced: don't reach, and the world is more tolerable.

The trouble is that the child carries this stance into every relationship that comes after.

## How it shows up in adult relationships

The abandonment loop in adulthood has a signature shape. See if any of these fit.

You don't ask for what you need. You've gotten skilled at not having needs, or at making the needs you do have small enough that they're easy to meet. You tell yourself you're low-maintenance. You tell yourself you're independent. Sometimes you even believe it.

When someone does get close, you feel the pull to test them. Not consciously — but you find yourself pulling back at the exact moment they lean in. Picking a fight over nothing. Going cold for a day. Finding the one flaw that proves they were going to leave anyway.

Or — the other face of the same loop — you stay long past the point of leaving. You hold on to a relationship that has already ended, emotionally, because walking away feels like the original not-meeting, and you cannot bear to feel that twice.

The most painful version: you pick people who are already leaving. The emotionally unavailable partner. The friend who is always on their way out the door. The boss who has one foot elsewhere. You pick them because they're familiar — because the nervous system recognizes the shape from childhood, and it interprets recognition as safety.

And here's the part that's hard to talk about. When someone finally shows up who is actually available, who actually meets you, who actually stays — you feel uneasy. Bored, even. The nervous system doesn't register safety as safety. It registers it as *wrong*. Because the only world it ever learned was the one where love came with a countdown.

## Why "just communicate" doesn't fix it

Well-meaning therapists and friends will tell you to communicate your needs. To be vulnerable. To let people in. This is good advice in principle. It is nearly impossible to execute from inside the loop.

Because the loop isn't a thinking problem. It's a survival response. The part of you that decided not to reach wasn't the part that argues with logic. It was the part that keeps you alive when being alive is too much. You can't talk that part out of its job. It will not be argued with. It will, if pushed, simply go quieter.

The first move is not to communicate differently. The first move is to see the loop running in real time. To catch the moment you decided not to ask. To notice the small private calculation: *if I don't say it, I can't be disappointed.*

That calculation is the loop. The whole loop, in one breath.

## The first step

Here's the exercise for today. Not a big one. Just this:

Once today, ask for something small that you actually want. A glass of water. Five more minutes before you start the meeting. The other half of the sandwich. Anything — as long as it's a real want, and as long as you say it out loud to another person.

The point isn't the water. The point is to break the muscle of automatic non-asking. To remind the part of you that stopped reaching that reaching is, in this room, with this person, allowed.

You will feel the pull to skip it. The pull to say *it doesn't matter, I'll get it myself.* That pull is the loop. Notice it. Then ask anyway.

This is not the cure. This is the first repetition of a different stance. The stance that says: *I am allowed to need things, and the right people are not leaving because I asked.*

---

**Tomorrow:** the control pattern. When managing your environment stops being a choice and becomes the pattern itself — and why "I have to handle everything" is sometimes the loop talking, not the truth.

Before then, sit with this:

*What's one thing you wanted this week and didn't ask for? Who were you afraid of disappointing — or losing — by asking?*

If you want to look at your specific chart against this pattern — the particular shape of the loop as it runs in your life, not the general one — book a session. There's no rush. The course continues tomorrow either way.`,
  },

  {
    day: 3,
    subject: "The control pattern",
    preheader: "When managing your environment becomes the pattern.",
    ctaText: "Book a session",
    ctaUrl: bookSessionUrl,
    body: `# The control pattern

Yesterday we looked at the abandonment loop — the stance of not-reaching. Today we look at its mirror image. The stance of reaching for everything. Of holding it all. Of *I'll handle it.*

This is the control pattern. And it is, in many ways, the more admired of the two. The abandonment loop gets pathologized. The control pattern gets praised. People who run it are called capable, responsible, strong, the one who holds it together. They get promoted. They get relied on. They get the quiet, exhausted respect of everyone around them.

It is also, very often, the same wound wearing a different outfit.

## How it forms

The control pattern usually begins in a house where someone wasn't reliable. A parent who drank. A parent whose moods ran the household. A parent who was emotionally a child themselves. An older sibling who needed parenting. A family system where, at some point, you were the one keeping things from falling apart.

You were young. The work was too big for you. But you did it anyway, because the alternative — letting it fall — felt worse.

And here's the thing: you were good at it. Better than a child should have to be. You learned to read the room before anyone spoke. To anticipate the next crisis before it landed. To have the answer ready, the plan in place, the emotional weather of the whole house mapped at all times.

This is a kind of intelligence. It is also a kind of survival. And it doesn't turn off when you leave the house.

## Agency vs. control

There's a distinction worth getting precise about.

**Agency** is the capacity to act on what's actually in front of you. To make a decision, take a step, adjust course. Agency requires that you see the situation clearly, including the parts you can't control. It is calm. It is specific. It moves things.

**Control** is the attempt to manage your nervous system by managing the environment. It is not really about the situation in front of you. It is about the feeling underneath — the old feeling, the one that says *if I don't handle this, it falls, and when it falls, I am alone.* Control is agency's anxious cousin. It looks like the same thing from the outside. From the inside, it is completely different.

The test: ask yourself, *if I let this go, what's the worst that happens?* If the answer is concrete and proportionate — *the report will be late, the dinner will be smaller* — you're operating from agency. If the answer is vague and catastrophic — *everything falls apart, I lose them, I can't* — you're operating from control. Same posture, different engine.

## "I have to handle everything"

This sentence is the control pattern speaking in its own voice.

It feels like the truth. It feels like responsibility. But notice what it actually contains: a belief that you are the only one who can, a belief that others will fail, a belief that the failure will be unendurable, and a belief that the cost to you is the acceptable price.

Each of those beliefs deserves a hard look.

You are not the only one who can. Sometimes you are. Often you aren't. The belief that you are is doing a lot of work — it's keeping you indispensable, which is the control pattern's way of keeping you safe.

Others will not always fail. Sometimes they will. The belief that they will is preemptive — it spares you the experience of trusting and being let down, by never trusting in the first place.

The failure, if it comes, will rarely be unendurable. The end-of-the-world feeling is a body memory, not a forecast. It is your nervous system remembering a time when someone's failure really did almost end your world — because you were small, and they were everything.

And the cost to you is *not* the acceptable price. This is the one the pattern fights hardest. The exhaustion. The resentment that leaks out sideways. The relationships that never get to deepen because you're too busy managing them. The body that starts to complain. The cost is real. It is paid daily. It is not, in the long run, sustainable.

## The hardest part

Here's the thing that makes the control pattern so hard to interrupt.

When you stop controlling, you don't immediately feel free. You feel *unsafe*. The room you've been holding up doesn't suddenly hold itself. People you've been covering for don't suddenly step up. The first weeks of letting go are uncomfortable, sometimes chaotic, and almost always accompanied by a voice in your head saying *see? I told you. Without me, it falls.*

That voice is the pattern. Not the truth.

Some things will fall. That's the cost. The question is whether you keep paying the cost of holding everything up, or whether you let some things fall and discover — slowly, over months — that the world doesn't end, and the people around you are more capable than your pattern has been giving them credit for.

## Today's exercise

Pick one thing today that you would normally handle yourself, and let someone else handle it. Something small. The groceries. The booking. The email you were going to send because no one else would send it right.

Then do nothing. Don't supervise. Don't follow up. Don't fix it when they do it differently than you would have.

Notice the discomfort. That discomfort is the pattern. You don't have to make it go away. You just have to not act on it, once.

---

**Tomorrow:** people-pleasing as self-abandonment. The cost of being easy to be with — and how attending to everyone else's needs can become the most effective way to never meet your own.

Before then:

*What did you take on this week that wasn't actually yours to carry? Whose voice in your head said you had to?*

If you want to look at the specific shape of the control pattern in your chart — where it comes from, where it's costing you the most — book a session. Tomorrow's email lands either way.`,
  },

  {
    day: 4,
    subject: "People-pleasing as self-abandonment",
    preheader: "The cost of being easy to be with.",
    ctaText: "Book a session",
    ctaUrl: bookSessionUrl,
    body: `# People-pleasing as self-abandonment

Of all the patterns, this one gets the most positive reinforcement.

People-pleasers are described as kind. Generous. Easy to be with. Low drama. A good friend. A good partner. A good employee. The person everyone wants at the table. The person no one has to worry about.

This is the trap. The pattern is rewarded by the very people it serves.

So let's name it precisely, because the word *people-pleasing* undersells it.

People-pleasing, at the level we're talking about, is **self-abandonment performed as accommodation.** It is the systematic, often unconscious, prioritization of other people's experience over your own — not because you don't have preferences, but because the cost of having preferences once felt too high.

It is not generosity. Generosity is what you do from a full cup. People-pleasing is what you do from a cup you're not even allowed to look at.

## How it forms

Same roots as the others, in a slightly different shape.

A child learns that their emotional reality is inconvenient to the people around them. Maybe a parent was overwhelmed. Maybe a parent was fragile. Maybe the household ran on the unstated rule *don't add to the load.* The child, who is exquisitely tuned to the adults' emotional weather, learns to manage it — by minimizing themselves.

The child gets good at reading what other people want before they ask. At becoming the easy one. At absorbing disappointment without complaint. At being *fine,* always fine, so finely fine that no one has to worry about them.

This works, in the short term. The household runs smoother. The parent relaxes. The child gets praise for being low-trouble. The nervous system files the stance under *things that keep me loved.*

The cost accrues quietly. The child loses contact with their own preferences. Not the big ones — those can be recovered. The small daily ones. What they actually want for dinner. What show they want to watch. Whether they want to go. The internal instrument that says *yes, this* and *no, not this* — that instrument atrophies from disuse. By adulthood, the person often genuinely doesn't know what they want. They only know what is wanted from them.

## How it shows up in adulthood

The signature shape:

You say yes when you mean no, and the no doesn't even fully form in your head before the yes is out of your mouth. You feel a low, constant exhaustion that you can't quite source. You are the person friends come to with their problems — and you are excellent at it — but you have a hard time bringing yours to anyone. You feel a vague resentment toward the people closest to you, and then feel guilty for the resentment, because *they didn't ask you to do all this.* You did. You always do.

You are, in the language of the world, easy to be with. And you are, in the language of your own body, almost never with yourself.

The hardest part to say out loud: people who love you often can't tell. Because the people-pleasing is so seamless, so total, that the person they love is partly a performance. They love someone who is partly not there. And you know this, somewhere, which is why closeness doesn't quite land — even when it's offered sincerely, you can't fully receive it, because you know you've curated what's being received.

This is the cost of being easy to be with. You are easy to be with because you are not fully there. And the more easily you are with others, the less you are with yourself.

## Why setting boundaries isn't the first move

Standard advice: set boundaries. Say no. Learn to disappoint people.

Good advice, eventually. But as a first move, it often backfires. Because if you try to set boundaries from inside the pattern, you'll set them harshly, guiltily, and at the wrong people. The boundary will feel like an act of violence, you'll apologize for it, and the cycle will continue.

The real first move is older than the boundary. It's the reactivation of preference.

You have to start knowing what you actually want. Small things first. Not *do I want this relationship* — that's a week-three question. Week one is: *do I want this tea or that tea. Do I want to sit here or there. Do I want to keep reading this book or put it down.*

Most people-pleasers, asked these questions, will feel a long pause where the answer should be. The pause is the atrophied instrument warming back up. Don't rush past the pause. The pause is the work.

## Today's exercise

Three times today, before you say yes to something, pause for one full breath. In that breath, ask yourself: *do I actually want to do this?*

You don't have to say no. You're allowed to say yes for good reasons — because it serves a value you hold, because you genuinely care, because the cost is small and the other person's need is real. The point is not to start saying no to everything. The point is to stop saying yes automatically.

The breath is the gap. The gap is where you live again.

## A note on guilt

If you do this — if you start noticing, start pausing, start occasionally saying the small no — you will feel guilty. The guilt is not a sign you're doing something wrong. The guilt is the pattern's death rattle. It is the voice of the stance that kept you safe by keeping you small, panicking because you're getting bigger.

Let the guilt be there. Don't argue with it. Don't obey it either. Just let it sit in the room with you while you do, once, the thing you actually wanted to do.

---

**Tomorrow:** the final day. What to do with everything we've named. When self-work is enough, when a session helps, and how to tell the difference.

Before then:

*Who in your life is loving someone who isn't fully there? What would change in that relationship if you showed up with ten percent more of your actual preference?*

If you want to look at where you abandoned yourself — and where the cost is showing up in your chart — book a session. The last email lands tomorrow.`,
  },

  {
    day: 5,
    subject: "What to do next",
    preheader: "Integration. Naming is the beginning, not the end.",
    ctaText: "Book a session",
    ctaUrl: bookSessionUrl,
    body: `# What to do next

Five days. Four patterns named. A stance, defined. A vocabulary, started.

This is the last email in the course. So let's be honest about what we've done — and what we haven't.

What we've done: you now have language for the four most common patterns AstroKalki sees. You know the shape of the abandonment loop, the control pattern, and people-pleasing as self-abandonment. And if you've been doing the daily exercises, you've caught at least one of them running in real time. That is not nothing. Most people go their whole lives without ever catching their own pattern in the act. The fact that you can now name it puts you ahead of where you were a week ago.

What we haven't done: we haven't fixed anything. We haven't unwound the original stance. We haven't retrained the nervous system. We haven't touched the specific way these patterns live in your particular history — your particular chart, your particular family, your particular first wound.

Naming is the beginning. Not the end.

Let's talk about what comes next.

## What self-work can do

There is real work you can do on your own, and you should do it. The exercises in this course are not throwaway — they're the daily reps. Pause before yes. Ask for the small thing. Notice the stance. Let one thing fall.

Add to that:

**Journal the pattern when you see it.** Not a long essay. Three lines. *What happened. What stance I took. What I felt in my body.* Over months, this builds a map. You'll start to see which rooms, which people, which times of day trigger which stance. The map is the work.

**Read your own life as a pattern, not a series of events.** When something painful happens, the instinct is to ask *why did they do that to me?* Try the second question too: *what stance was I taking that this landed the way it did?* Not because it's your fault. Because it's the only part you can change.

**Stay in the noticing longer than is comfortable.** The pull, once you see a pattern, is to fix it immediately. Resist. Stay with the seeing. The seeing itself, repeated, does something the fixing can't — it loosens the pattern's grip on the parts of you that argument can't reach.

This is slow work. Months, not weeks. But it works. People who do it consistently, even without a session, report real shifts. Relationships change. Decisions get easier. The body settles. Not because the pattern is gone — because the pattern is *seen,* and a seen pattern has less room to run you.

## When a session helps

There's a point where self-work plateaus. You can name the pattern. You can catch it sometimes. But there's a layer underneath the naming that doesn't move, no matter how much you journal. That layer is the original wound — the specific situation, the specific age, the specific person — and it doesn't yield to general vocabulary. It yields to being seen specifically.

This is what a session does that an email course can't.

A session reads your chart against the pattern. Not the general abandonment loop — *your* abandonment loop. The particular house it started in. The particular way it shows up in your relationships. The particular exit you keep walking toward. The particular person whose face you're still bracing against.

A session also gives you something self-work structurally cannot: a witness. Someone trained to hold the seeing with you, so you're not doing it alone in your own head. Patterns were built in relationship. They are hardest to move outside of one. The presence of another person — calm, trained, not in the pattern with you — is a different kind of instrument than a journal. It's not better. It's different. For some layers, it's necessary.

## How to tell which you need

You probably need self-work alone if: you can name the pattern, the naming brings relief (not just more shame), and your life is shifting in small concrete ways — fewer of the same argument, less of the same exhaustion, a sense of choice where there used to be only reaction.

You probably need a session if: you can name the pattern but nothing is moving. You keep catching it after the fact, never in time. The naming has brought up old feeling you can't quite reach. Or you've hit a wall where you understand intellectually what's happening and your body is still doing it anyway.

The second one is more common than people think. Patterns are smarter than intellect. They were built before language. They don't yield to language alone.

## If you want to go further

If anything in this course named something you'd like to look at more closely — not in the general sense, but in the *this is mine* sense — you can book a session. The session will read your chart against the pattern you've identified, trace it to its origin in your specific history, and give you language for the particular shape it takes in your life. That language, once heard, tends to keep working on you for weeks after the session ends.

If you're not ready, that's fine. The course is yours. Re-read it. Do the exercises again. Come back when one of them starts landing differently. The patterns don't go anywhere — and neither does the work.

Either way: thank you for taking the five days. Most people don't. The fact that you read this far tells me something about you. It tells me you've started catching the stance. That's the whole game. The rest is repetition.`,
  },
];

/**
 * Get a specific day's email (1-indexed). Returns null for out-of-range days.
 */
export function getCourseEmail(day: number): CourseEmail | null {
  if (day < 1 || day > COURSE_EMAILS.length) return null;
  return COURSE_EMAILS[day - 1]!;
}

/**
 * Total number of days in the course.
 */
export const COURSE_LENGTH = COURSE_EMAILS.length;
