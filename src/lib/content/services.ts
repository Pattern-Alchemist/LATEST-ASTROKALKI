/**
 * Five core service pages — each one a standalone SEO landing page
 * targeting a specific search intent, with Service schema, FAQ schema,
 * and a soft CTA into the booking flow.
 *
 * These are not "service offerings" in the generic agency sense.
 * They are five doors into the same work, framed by the specific
 * emotional situation a person is likely to be in when they search.
 */

export interface ServicePage {
  slug: string;
  title: string;
  /** Short headline shown below the H1 */
  headline: string;
  /** The search intent this page targets */
  targetKeyword: string;
  /** Secondary keywords for the page's metadata */
  secondaryKeywords: string[];
  metaDescription: string;
  /** Who this is for — second-person, emotionally specific */
  whoItsFor: string;
  /** What we actually do in the session */
  whatWeDo: string[];
  /** What you leave with — concrete, not vague */
  whatYouLeaveWith: string[];
  /** The session structure, in plain language */
  sessionStructure: { label: string; detail: string }[];
  /** Pricing tiers */
  pricing: { duration: string; price: string; best: string }[];
  /** FAQs specific to this service */
  faqs: { q: string; a: string }[];
  /** The pattern this service most often surfaces */
  relatedPattern?: string;
  /** Related article slugs in the cluster */
  relatedArticles: string[];
}

export const SERVICES: ServicePage[] = [
  {
    slug: "relationship-pattern-analysis",
    title: "Relationship Pattern Analysis",
    headline:
      "For the person who keeps arriving at the same relationship wearing a different face.",
    targetKeyword: "relationship pattern analysis",
    secondaryKeywords: [
      "why do I keep attracting the same relationship",
      "trauma bond reading",
      "repeating relationship cycles",
      "attachment pattern astrology",
      "karmic relationship signs",
    ],
    metaDescription:
      "A 60-minute session that names the relational pattern running your love life — not the partner, the pattern beneath every partner. Vedic chart as diagnostic tool, not prediction.",
    whoItsFor:
      "You have noticed — perhaps for years — that your relationships follow a shape. The faces change. The age, the profession, the accent, the way they smile at you in the first month. None of it stays. But the shape stays. The way it begins. The way it tightens. The way it ends. You are not attracted to a type. You are attracted to a pattern, and the pattern has you.",
    whatWeDo: [
      "Pull the birth chart and locate the relational signatures — Venus, Moon, the 7th house, and the aspect patterns that touch them",
      "Map those signatures to the lived relational history you bring to the session — every important relationship, including the ones you'd rather not name",
      "Identify the specific pattern running underneath: abandonment loop, control loop, people-pleasing, emotional numbness, overthinking, or self-doubt",
      "Trace the pattern back to its first installation — usually the family of origin, sometimes an early bond that taught your nervous system what 'love' means",
      "Name the exit. Not the fix. The exit — the moment in the next relationship where you will be tempted to repeat the pattern, and what to do instead",
    ],
    whatYouLeaveWith: [
      "The name of your relational pattern, in plain language",
      "An understanding of why this pattern, specifically, got installed in you",
      "The signature moments where the pattern will try to repeat — the early-warning signals",
      "A concrete reference for what to do at each of those moments — not theory, but the actual next move",
      "A clear sense of whether the work continues (deeper sessions) or whether this single session was enough for now",
    ],
    sessionStructure: [
      {
        label: "Intake",
        detail:
          "You share your birth details (date, time, place) and a short relational history before the session. No essay required — just the facts and the relationships that mattered.",
      },
      {
        label: "Chart pull",
        detail:
          "I prepare the chart and the relational signatures in advance. The session itself is not spent looking at the chart. It is spent looking at you.",
      },
      {
        label: "Pattern naming",
        detail:
          "The first 30 minutes are me showing you the pattern in your chart and in your history — back and forth, with your lived experience as the validator.",
      },
      {
        label: "Exit mapping",
        detail:
          "The last 30 minutes map where the pattern will try to repeat in your current or next relationship — and what to actually do at each of those moments.",
      },
      {
        label: "Recording",
        detail:
          "The session is recorded (audio) and sent to you within 24 hours. Listening back, often months later, is when most of the integration actually lands.",
      },
    ],
    pricing: [
      { duration: "60 minutes", price: "₹2,499", best: "First session" },
      { duration: "90 minutes", price: "₹3,499", best: "Deeper pattern work" },
    ],
    faqs: [
      {
        q: "Is this the same as couples counselling?",
        a: "No. This is one-to-one work, even if your pattern is showing up inside a relationship. The session is about the architecture you bring to relationships — not about mediating a specific one. If you are in crisis with a current partner, couples therapy is the right first call. This is the work that makes future relationships different.",
      },
      {
        q: "Do I need to be in a relationship to book this?",
        a: "No. Many of the clearest sessions happen between relationships — when the pattern is not currently being enacted and you can finally see it from above. If you are single and noticing the shape of your past relationships, this is often the best moment.",
      },
      {
        q: "Will you tell me if my current relationship is right or wrong?",
        a: "No. The session does not make decisions for you. It shows you the pattern, which usually makes the right decision obvious — but the decision is yours. Anyone who tells you to stay or leave based on a chart is performing astrology, not pattern recognition.",
      },
      {
        q: "What if my birth time is approximate?",
        a: "We can still work with a window of a few hours. Some patterns are visible regardless of the exact ascendant. If precision matters for a specific signature, I'll tell you during intake — and you can often confirm the time with a parent or hospital record before the session.",
      },
      {
        q: "How is this different from the Karmic Relationship Reading?",
        a: "The Relationship Pattern Analysis is the broader work — it maps your relational architecture across all relationships. The Karmic Relationship Reading is the specific case where the pattern is currently manifesting as a single repeating partner (the same archetype showing up under different names). If you are unsure which to book, start here.",
      },
    ],
    relatedPattern: "abandonment",
    relatedArticles: [
      "why-you-keep-attracting-the-same-relationship",
      "the-difference-between-love-and-trauma-bonding",
      "why-toxic-relationships-feel-familiar",
    ],
  },
  {
    slug: "karmic-relationship-reading",
    title: "Karmic Relationship Reading",
    headline:
      "For the person who keeps meeting the same person, wearing different names.",
    targetKeyword: "karmic relationship reading",
    secondaryKeywords: [
      "karmic relationship signs",
      "why do toxic relationships feel familiar",
      "trauma bond astrology",
      "repeating partner pattern",
      "soulmate vs karmic pattern",
    ],
    metaDescription:
      "A focused reading for the person who recognises they keep meeting the same partner under different names. Not a compatibility reading — a pattern recognition of the archetype repeating in your life.",
    whoItsFor:
      "There is a person you keep meeting. The name changes. The face changes. Sometimes the gender changes. But the way they arrive is the same — the intensity, the familiarity, the sense that you have known them before. And the way they leave is the same too. You are not meeting new partners. You are meeting the same archetype, and you are still inside the lesson it came to teach.",
    whatWeDo: [
      "Pull your chart and the chart of the recurring archetype (a specific partner is not required — the archetype is what we are reading)",
      "Locate the planetary signature that pulls this archetype toward you — usually a Moon-Saturn, Venus-Rahu, or 7th-house pattern",
      "Trace the karmic thread: the early bond that taught your nervous system this person equals love, even when this person equals pain",
      "Identify the lesson the archetype is trying to deliver — and why you keep refusing to learn it",
      "Map the exit: what changes in you the moment the lesson is integrated, and the archetype stops appearing",
    ],
    whatYouLeaveWith: [
      "The shape of the archetype you keep attracting, named precisely",
      "The early-bond origin point — usually a parent or first love — that installed this as 'home'",
      "The lesson the archetype is asking you to integrate, in plain language",
      "The signs that the pattern is breaking — what changes inside you when it stops pulling",
      "A clear answer to the question most people in this pattern ask: 'is this person my karmic partner, or just another version?'",
    ],
    sessionStructure: [
      {
        label: "Intake",
        detail:
          "You share birth details and a short list of the relationships that felt karmically charged — the ones you couldn't explain but couldn't leave.",
      },
      {
        label: "Archetype mapping",
        detail:
          "I prepare the chart and locate the archetype signature. The session opens by naming the archetype aloud — often the moment a person recognises it for the first time.",
      },
      {
        label: "Origin trace",
        detail:
          "The middle of the session traces the archetype back to its installation — the early bond where love and pain first became inseparable.",
      },
      {
        label: "Lesson identification",
        detail:
          "We name the lesson the archetype is delivering. This is the part most people resist — because the lesson is usually the one they've spent years avoiding.",
      },
      {
        label: "Exit mapping",
        detail:
          "We close with what changes in you when the lesson lands — and what the next relationship looks like when it stops being this archetype.",
      },
    ],
    pricing: [
      { duration: "60 minutes", price: "₹2,499", best: "Single relationship pattern" },
      { duration: "90 minutes", price: "₹3,499", best: "Multiple recurring archetypes" },
    ],
    faqs: [
      {
        q: "Is a karmic relationship a real thing, or just a way of saying 'difficult'?",
        a: "In the way most astrology uses the word, 'karmic' has become a vague label for any painful relationship. In this work, a karmic relationship means something specific: a partnership where the same archetypal pattern is repeating across multiple partners, and the nervous system reads the repetition as 'familiar' rather than as 'warning'. The reading identifies whether what you are calling karmic is actually a pattern — or just a hard situation.",
      },
      {
        q: "Do I need my partner's birth details?",
        a: "No. The reading is of your chart and your archetype — the partner is a manifestation of a pattern in you, not the other way around. If your partner's birth details are available and you want to discuss compatibility, that can be added — but it is not required.",
      },
      {
        q: "Will this tell me if I should stay with my current partner?",
        a: "No. This is the one question this work will not answer — because the question itself is usually a symptom of the pattern. By the end of the session, the question almost always answers itself. But the practitioner will not make the decision for you.",
      },
      {
        q: "I've been told my partner is my 'soulmate' / 'twin flame' — is this the same thing?",
        a: "Those terms belong to a different framework. This work does not use them, because they tend to romanticise patterns that are actually painful. If a relationship is intense, familiar, and difficult to leave, the reading will tell you what is actually happening — not what to call it.",
      },
      {
        q: "What if I've already left the karmic partner — can I still book this?",
        a: "Yes, and this is often the best time. After the exit, the pattern is most visible — because it is no longer being enacted. The reading can confirm what you suspected, name what the lesson was, and prepare you for what the next relationship will look like if the lesson has landed.",
      },
    ],
    relatedPattern: "people-pleasing",
    relatedArticles: [
      "why-toxic-relationships-feel-familiar",
      "the-difference-between-love-and-trauma-bonding",
      "attachment-style-vs-karmic-pattern",
    ],
  },
  {
    slug: "emotional-pattern-decode",
    title: "Emotional Pattern Decode",
    headline:
      "For the person who keeps feeling the same thing, in situation after situation, and can't name why.",
    targetKeyword: "emotional pattern decode",
    secondaryKeywords: [
      "why do I feel emotionally exhausted",
      "emotional confusion astrology",
      "emotional repetition pattern",
      "why do I feel misunderstood",
      "depth psychology astrology",
    ],
    metaDescription:
      "A 60-minute session that decodes the emotional pattern beneath your recurring feelings — exhaustion, confusion, numbness, overwhelm. Not therapy. Pattern recognition that therapy often can't reach.",
    whoItsFor:
      "There is a feeling you keep having. It doesn't seem to belong to the situation you are in. The situation ends, the feeling stays. The job changes, the feeling stays. The relationship ends, the feeling stays. You have started to suspect the feeling is not a response to your life — it is the lens through which you experience your life. That lens has a name. This session finds it.",
    whatWeDo: [
      "Pull the chart and locate the emotional signatures — Moon, the 4th house, and any planets aspecting them",
      "Map the emotional pattern to your lived experience — what triggers it, what doesn't, what makes it worse, what (if anything) ever makes it stop",
      "Identify the specific emotional loop: emotional numbness, overthinking, self-doubt, or chronic overwhelm",
      "Trace the loop to its installation — usually early, often preverbal, sometimes multigenerational",
      "Map the practical exits — not therapeutic abstractions but the actual moves that interrupt the loop in daily life",
    ],
    whatYouLeaveWith: [
      "The name of your dominant emotional pattern, in specific language",
      "An understanding of what the pattern is actually doing for you — every emotional pattern has a function, even when it looks like dysfunction",
      "The trigger map — the situations, people, and internal states that activate the pattern",
      "Concrete interruption moves for each trigger — what to do in the moment, not what to journal about later",
      "A clear sense of whether deeper pattern work (Shadow Session) is needed, or whether the decoding itself is enough",
    ],
    sessionStructure: [
      {
        label: "Intake",
        detail:
          "You share birth details and a short description of the recurring feeling. No need to write an essay — a few sentences about the feeling and where it shows up is enough.",
      },
      {
        label: "Chart preparation",
        detail:
          "I prepare the chart and identify the emotional signatures in advance. The session opens with the pattern already named — we don't spend the hour discovering it, we spend the hour understanding it.",
      },
      {
        label: "Pattern walkthrough",
        detail:
          "The first half of the session walks you through the pattern in your chart and your life — back and forth, with your lived experience as the validator.",
      },
      {
        label: "Function identification",
        detail:
          "The middle of the session asks the question most people skip: what is this pattern doing for you? Every emotional pattern has a function. Naming the function is what allows it to release.",
      },
      {
        label: "Exit mapping",
        detail:
          "The last section maps the practical moves — what to do at each trigger point, in plain language, no jargon.",
      },
    ],
    pricing: [
      { duration: "60 minutes", price: "₹2,499", best: "First decode" },
      { duration: "90 minutes", price: "₹3,499", best: "Layered patterns" },
    ],
    faqs: [
      {
        q: "Is this therapy?",
        a: "No. Therapy works with the conscious mind, over time, often through dialogue. This work reads the underlying architecture immediately — the pattern is named within the first half of the session. The two are complementary, not interchangeable. Many clients use this session to make their therapy more effective, because the pattern they have been circling in therapy for years gets named here in the first 30 minutes.",
      },
      {
        q: "I've been in therapy for years and I still feel this way — will this be different?",
        a: "Often, yes — but not because therapy failed. Therapy and pattern recognition work at different layers. Therapy works with the conscious narrative. Pattern recognition works with the underlying architecture that produces the narrative. If you have done years of therapy and the feeling persists, it usually means the architecture underneath hasn't been named yet. This session names it.",
      },
      {
        q: "Will this be emotionally intense?",
        a: "Sometimes. The pattern is being named, often for the first time, and that can be moving. But the session is not cathartic by design — there is no breathwork, no regression, no forced release. The intensity, when it comes, is the intensity of recognition. Most clients describe it as relief, not overwhelm.",
      },
      {
        q: "What if I don't know my birth time?",
        a: "Some emotional patterns are visible regardless of exact ascendant — particularly Moon sign and Moon aspects. If your birth time is unknown or approximate, we work with what's available. Certain patterns (especially those involving the ascendant or house placements) may be less precise, and I'll tell you that during intake.",
      },
      {
        q: "How is this different from the Relationship Pattern Analysis?",
        a: "The Relationship Pattern Analysis is specifically about relational architecture — partners, parents, the bonds that shaped your love life. The Emotional Pattern Decode is broader — it works with emotional loops that may or may not show up primarily in relationships. If your recurring feeling is 'exhausted', 'numb', 'overwhelmed', or 'confused', this is the session. If your recurring feeling is specifically 'I keep ending up in the wrong relationship', book the Relationship Pattern Analysis.",
      },
    ],
    relatedPattern: "emotional-numbness",
    relatedArticles: [
      "why-you-ruin-good-opportunities",
      "hidden-forms-of-self-sabotage",
      "astrology-as-a-pattern-recognition-tool",
    ],
  },
  {
    slug: "shadow-work-consultation",
    title: "Shadow Work Consultation",
    headline:
      "For the person who keeps meeting themselves in the people they can't stand.",
    targetKeyword: "shadow work consultation",
    secondaryKeywords: [
      "shadow work astrology",
      "jungian shadow reading",
      "projection in relationships",
      "what is my shadow",
      "integrated self astrology",
    ],
    metaDescription:
      "A 90-minute consultation that maps the Jungian shadow in your birth chart — the disowned parts of yourself you keep meeting in other people. For people ready to do the deeper work.",
    whoItsFor:
      "There is a kind of person you cannot stand. You can describe them precisely — their tone, their tactics, the way they make you feel. You have strong opinions about them. You can spot them from across a room. And the chances are, they are carrying a part of you that you disowned a long time ago. This consultation is for people ready to look at that. Not to like the disowned part. To see it. To stop projecting it outward and start integrating it inward.",
    whatWeDo: [
      "Pull the chart and locate the shadow signatures — typically Saturn, Ketu, the 12th house, and any planets in Scorpio or Pisces",
      "Map the shadow material to your projections — the specific kinds of people who trigger disproportionate reactions in you",
      "Identify the disowned part: usually a quality you were taught (explicitly or implicitly) was unacceptable in childhood",
      "Trace the projection pattern — where in your life this disowned part keeps appearing as 'them' rather than 'me'",
      "Map the integration path — not to like the disowned part, but to stop projecting it, and to reclaim the energy bound up in the projection",
    ],
    whatYouLeaveWith: [
      "The specific shape of your shadow material — the disowned qualities that keep appearing as projections",
      "An understanding of why these particular qualities were disowned — the early environment that taught you they were unacceptable",
      "A projection map — the kinds of people, situations, and triggers where the shadow will keep appearing until it's integrated",
      "The integration path — concrete, not abstract, including the daily practices that begin to absorb the projection back into yourself",
      "A clear sense of what changes in your relationships when the projection stops (most people find that the triggering people simply stop appearing, or stop triggering)",
    ],
    sessionStructure: [
      {
        label: "Intake",
        detail:
          "You share birth details and a list of the kinds of people who trigger disproportionate reactions in you. We don't need a full history — we need the triggers, because the triggers are the map.",
      },
      {
        label: "Shadow mapping",
        detail:
          "I prepare the chart and identify the shadow signatures in advance. The session opens with the shadow material named — the qualities you disowned and how the chart shows them.",
      },
      {
        label: "Projection walkthrough",
        detail:
          "The first half of the session walks through your projections and shows how each one corresponds to a disowned quality. This is often the most confronting part of the work.",
      },
      {
        label: "Origin trace",
        detail:
          "We trace when and why each quality was disowned — usually a specific phase of childhood, sometimes a specific event, sometimes a slow message received over years.",
      },
      {
        label: "Integration mapping",
        detail:
          "The last section maps the integration path — not to celebrate the disowned qualities, but to absorb them back into yourself so they stop appearing as 'other people'.",
      },
    ],
    pricing: [
      { duration: "90 minutes", price: "₹3,499", best: "Standard consultation" },
      { duration: "120 minutes", price: "₹4,499", best: "Deep shadow work" },
    ],
    faqs: [
      {
        q: "What is the shadow, exactly?",
        a: "In Jungian psychology (which is the framework this work uses), the shadow is the collection of qualities, impulses, and capacities that a person disowned during childhood — usually because expressing them led to disapproval, punishment, or withdrawal of love. The shadow is not 'the dark side' in a moral sense. It is simply the parts of yourself you learned to keep out of sight. The cost of disowning them is that they tend to appear in your life as projections onto other people, who then trigger you in disproportionate ways.",
      },
      {
        q: "How does astrology show the shadow?",
        a: "Certain placements in the birth chart tend to correlate with shadow material — Saturn (the disowned structure), Ketu (the south node, what is familiar but unowned), the 12th house (what is hidden from the conscious self), and any planets in Scorpio. The chart doesn't create the shadow. It marks where the shadow material is most accessible to work with. Reading the chart this way is diagnostic, not predictive.",
      },
      {
        q: "Is this psychologically safe?",
        a: "Yes, with one caveat: this is not therapy, and it is not a substitute for therapy if you are in active crisis, dealing with severe trauma, or experiencing mental health symptoms that require clinical care. For stable adults doing depth work, the consultation is safe — confronting, but safe. If you are unsure whether this is the right moment, message first and I will advise honestly.",
      },
      {
        q: "Will I have to do things I'm uncomfortable with?",
        a: "No. The integration practices are concrete, daily, and modest — small acts of reclamation, not dramatic rituals. The discomfort in shadow work is the discomfort of recognition, not the discomfort of being asked to behave in ways that feel wrong.",
      },
      {
        q: "How is this different from the Emotional Pattern Decode?",
        a: "The Emotional Pattern Decode works with the emotional loop you keep feeling — exhaustion, numbness, overwhelm. The Shadow Work Consultation works with the disowned qualities you keep projecting onto other people. If your recurring problem is 'I keep feeling this way', book the Decode. If your recurring problem is 'I keep being triggered by these kinds of people', book the Shadow Work Consultation. Many people do both, in sequence.",
      },
    ],
    relatedPattern: "control",
    relatedArticles: [
      "why-you-ruin-good-opportunities",
      "hidden-forms-of-self-sabotage",
      "shadow-work-through-astrology",
    ],
  },
  {
    slug: "life-direction-session",
    title: "Life Direction Session",
    headline:
      "For the person standing at a threshold, unable to see which direction is actually theirs.",
    targetKeyword: "life direction session",
    secondaryKeywords: [
      "why do I feel lost in life",
      "identity crisis astrology",
      "purpose confusion reading",
      "career direction astrology",
      "psychology of reinvention",
    ],
    metaDescription:
      "A 90-minute session for the person at a life threshold — the career shift, the marriage ending, the question of whether to stay or go. The chart read as a map of what is actually yours to do.",
    whoItsFor:
      "You are at a threshold. It might be a career you have outgrown. It might be a marriage that has reached the edge of what it can carry. It might be the slow realisation that the person you became to survive your twenties is not the person you actually are. The threshold is real. The difficulty is that you cannot see, from inside it, which direction is actually yours — and which is just the next repetition of an old pattern. This session is for that.",
    whatWeDo: [
      "Pull the chart and locate the directional signatures — the 10th house (work), the 4th house (foundation), the ascendant (self), and the planets currently activating them by transit",
      "Map the current threshold to its actual scale — some thresholds are tactical (a job change), some are developmental (an identity shift), and confusing the two leads to bad decisions",
      "Identify which direction is actually yours — as distinct from the direction your family, your partner, or your survival pattern is pulling you toward",
      "Trace the threshold to its origin — most thresholds are not random; they arrive when an old self has reached the limit of what it can carry",
      "Map the next move — concrete, time-bounded, and aligned with the larger arc of your chart, not just the immediate pressure you are feeling",
    ],
    whatYouLeaveWith: [
      "A clear reading of the threshold you are actually at — not the one your situation is presenting as",
      "The distinction between tactical decisions (job, location, relationship status) and developmental ones (who you are becoming)",
      "A map of the direction that is actually yours, as distinct from the directions being pressed on you",
      "A concrete next move — not a five-year plan, but the next decision that aligns the immediate situation with the larger arc",
      "A time horizon for the threshold — when this phase began, when it will likely complete, and what 'completion' actually looks like",
    ],
    sessionStructure: [
      {
        label: "Intake",
        detail:
          "You share birth details and a description of the threshold you are at — the decision you're facing, the pressure you're feeling, the options you're weighing.",
      },
      {
        label: "Threshold mapping",
        detail:
          "I prepare the chart and identify the directional signatures in advance. The session opens by mapping the actual scale of the threshold — tactical or developmental.",
      },
      {
        label: "Direction identification",
        detail:
          "The first half of the session identifies which direction is actually yours — distinct from the directions being pressed on you by family, partner, or survival pattern.",
      },
      {
        label: "Origin trace",
        detail:
          "We trace the threshold back to its beginning — usually a year or two before you noticed it. Most thresholds arrive as a slow erosion long before they arrive as a crisis.",
      },
      {
        label: "Next-move mapping",
        detail:
          "The last section maps the concrete next move — the specific decision, time horizon, and what 'aligned with the larger arc' actually looks like in practice.",
      },
    ],
    pricing: [
      { duration: "90 minutes", price: "₹3,499", best: "Standard session" },
      { duration: "120 minutes", price: "₹4,499", best: "Complex threshold" },
    ],
    faqs: [
      {
        q: "Will you tell me what decision to make?",
        a: "No. The session does not make decisions for you. It clarifies the threshold, identifies the direction that is actually yours, and maps the next move — but the move itself is yours to make. Anyone who tells you to take a specific job, marry or divorce a specific person, or move to a specific city based on a chart is performing astrology, not pattern recognition.",
      },
      {
        q: "I'm in the middle of a crisis — is this the right time?",
        a: "Depends on the crisis. If you are in active mental health crisis, in a safety-threatening situation, or in the first weeks of an acute grief or shock, the right first call is clinical care or a crisis line. If you are in a sustained threshold — a long-building decision, a slow erosion, a question that has been with you for months — this is often exactly the right moment. Message if unsure.",
      },
      {
        q: "Is this career astrology?",
        a: "No, although career is often part of what comes up. This session is about the larger direction of your life — work is one expression of that, but so are partnership, location, family, and the question of who you are becoming. If your question is purely tactical ('should I take this specific job'), a 60-minute session focused on that decision is more appropriate.",
      },
      {
        q: "What if I don't know my birth time?",
        a: "Birth time matters more for this session than for the others, because the ascendant and house placements are central to directional work. If you don't know your birth time, message before booking — we can often work with an approximate window, but some directional questions will be less precise.",
      },
      {
        q: "Can this session be done more than once?",
        a: "Yes, and many people return at major thresholds — every few years, when the next developmental phase arrives. The chart itself doesn't change, but the transits activating it do, and the threshold you are at now is not the threshold you will be at in three years.",
      },
    ],
    relatedPattern: "self-doubt",
    relatedArticles: [
      "why-you-feel-lost-in-life",
      "identity-crisis-explained",
      "when-your-old-self-no-longer-fits",
    ],
  },
];

export const SERVICE_BY_SLUG: Record<string, ServicePage> = Object.fromEntries(
  SERVICES.map((s) => [s.slug, s])
);
