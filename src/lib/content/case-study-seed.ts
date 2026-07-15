/**
 * M9-d · Case study seed content.
 *
 * Three anonymised long-form client journeys, structured as
 *   Problem → Pattern → Session → Shift.
 *
 * Voice rules (AstroKalki editorial):
 *   - Direct, psychologically precise, second-person observations where they land
 *   - No clinical jargon ("attachment style", "inner child", "trauma bond" only when the
 *     client themselves used the word and we are quoting it back)
 *   - No mystical abstraction — the chart is a diagnostic instrument, not a forecast
 *   - Specific over general: the surface detail is the evidence
 *   - Identifying details have been changed; first-initial + age only
 *
 * Each case is approximately 2000 words across the 4 sections.
 * Seeded into the DB on first access of /case-studies (when DB is empty),
 * then editable from /admin/case-studies.
 */

export interface CaseStudySeed {
  slug: string;
  title: string;
  pattern: string; // atlas pattern slug
  clientInitials: string;
  clientAge: number | null;
  consentGiven: boolean;
  problem: string; // markdown
  patternSection: string; // markdown
  session: string; // markdown
  shift: string; // markdown
}

export const CASE_STUDY_SEEDS: CaseStudySeed[] = [
  // ───────────────────────────────────────────────────────────────────────
  // Case 1 — R., 34 — The abandonment loop that wasn't about leaving
  // Pattern: the-abandonment
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "r-34-the-abandonment-loop-that-wasnt-about-leaving",
    title: "The abandonment loop that wasn't about leaving",
    pattern: "the-abandonment",
    clientInitials: "R.",
    clientAge: 34,
    consentGiven: true,
    problem: `R. came in saying she had a leaving problem. Three relationships in nine years. Each one ended the same way: she would feel the man pulling back — sometimes real, sometimes imagined — and within six weeks she would be the one to go. The leaving was always decisive, planned, calm. She was proud of that. She had not been left since she was twenty-two, and she did not intend to be left again.

What she could not explain was why the leaving never felt like relief.

She described the aftermath the same way each time. Two weeks of clarity. Then a slow unraveling that she could not name. Sleep thinning. Wine earlier in the evening. A particular kind of restlessness in her chest that she called "the hum." The hum was not grief — she was clear about that. It was the feeling of having left something that was not actually finished.

The third relationship had ended fourteen months before our session. She had not dated since. She told me she was "done with relationships." She said it the way a person says they are done with a food that made them sick — final, slightly proud, slightly defensive. She had come in not to fix the pattern but to understand it. She wanted to know why the leaving, which she experienced as her power, kept producing the same hollow aftermath.

I asked her to walk me through the moment of each leaving — not the decision, the moment before the decision. She described all three in identical language. A particular silence at dinner. A text answered one minute slower than usual. A look on his face that she could not read. Each time, the same thought arrived in the same form: *he is going to leave. I should leave first.*

I asked her where she thought that thought came from. She said: "From my mother." Her mother had left when R. was eleven. Not physically — physically she was present every day. Emotionally, she had withdrawn into a depression that lasted four years. R. had spent those years trying to read her mother's face for signs of return. She had become, by twelve, an expert in the micro-expressions of withdrawal.

She said all of this in the first thirty minutes. She had been in therapy for four years. She had said all of it before. The pattern was named. The pattern was understood. The pattern continued.

She looked at me and said: "I already know all of this. I don't know why I keep doing it."`,

    patternSection: `The chart told a different version of the same story — and the difference was the work.

R.'s chart showed the abandonment signature clearly. Moon in Scorpio, conjunct Ketu in the fourth house, receiving a square from Saturn in the seventh. The Moon-Ketu conjunction in the house of the mother is, in this work, the signature of an emotional imprint that was severed before it could land — the mother's presence was there in form and absent in function. Saturn's aspect to that conjunction from the seventh house is the reinforcing loop: the very part of her that was wounded by withdrawal is the part she projects onto partners, and the part she expects to abandon her.

She had heard all of this in language before — attachment style, inner child, abandonment wound. The chart said it differently in one specific way: it located the pattern in time.

The Moon-Ketu conjunction is not just about the mother. It is about an emotional *kind* of knowing that was interrupted. Ketu cuts. The Moon feels. Together they describe a child who learned to feel at full depth and then was taught, suddenly, that the feeling had no return address. The child does not stop feeling. The child stops expecting return.

What R. had been calling "leaving" was not leaving at all. It was the activation of a much earlier decision: *I will not wait to be left.* The decision had been made at eleven. It had been running, uninterrupted, for twenty-three years.

The Saturn aspect from the seventh house explained the specific trigger. Saturn is structure, delay, withdrawal of approval. Saturn in the seventh, aspecting the Moon-Ketu wound, means: the moment a partner exhibits any Saturnine quality — distance, silence, delay, unreadability — the eleven-year-old's decision fires. The leaving is not a response to the present partner. It is a re-enactment of the original severance, performed this time by the child who now has the power to be the one who goes.

This is why the leaving never produced relief. Relief comes from a real ending. R.'s leavings were not endings — they were performances of an ending that had already happened, repeated in the hope that this time the performance would resolve the original. It never does. The original is not in the present relationship. The original is in the chart, and in the body of the eleven-year-old.

The pattern, named this way, stopped being a character flaw. R. had spent four years in therapy working on her "fear of abandonment." The chart suggested a more precise frame: she did not fear abandonment. She had already been abandoned, at eleven, by a mother who was physically present. Everything since was a re-staging. The fear was not anticipatory. It was retrospective, performed forward.

This is the difference the chart makes. Therapy had correctly identified the pattern. The chart located it — in a house, in an aspect, in a moment of childhood that the chart and the biography shared. When both agree, the pattern stops being a story the client tells about themselves and becomes a structure they can see from above.`,

    session: `The session was ninety minutes. The first thirty were R. telling me the story she had told her therapist for four years. I let her. The story was true. It was also the wall.

At minute thirty-one I asked her to stop telling me about the pattern and tell me about the hum.

She paused. She said no one had ever asked her to describe it. She had used the word "hum" in therapy. No one had followed it. She closed her eyes. She said the hum was in her sternum. She said it felt like a phone ringing in another room — not loud, not painful, but impossible to ignore, and impossible to answer.

I asked her when the hum started. She said: two weeks after each leaving. I asked her when it stopped. She said: it didn't, not really. It just got quieter over months. It had been at full volume for fourteen months, since the third leaving. That was why she had come in.

I showed her the chart. I did not interpret it for her. I showed her the Moon-Ketu conjunction and the Saturn aspect and I asked her what she saw. She is not an astrologer. She looked at it for a long time. She said: "The wound is in the mother house. The trigger is in the partner house. They are talking to each other."

I said: yes.

I asked her to go back to the first leaving. Not the story of it. The moment before. The dinner. The silence. I asked her what she had felt in her body in that silence.

She said: "My chest went tight. I felt small. I felt like I was eleven and my mother had just stopped looking at me."

I asked: "When you left him two weeks later, did the tightness go away?"

She was quiet for a long time. She said: "No. The tightness is the hum. The leaving didn't touch the tightness. The leaving was something I did *with* the tightness."

This was the moment of the session. Not a breakthrough — a recognition. The recognition was that the leaving and the hum were the same event, separated by two weeks. The leaving was the action-version of the hum. The hum was the feeling-version of the leaving. Neither one resolved the original wound because neither one was aimed at the original wound. Both were aimed at the present partner, who was not the source.

I asked her to do one thing. I asked her to imagine the eleven-year-old who had made the decision. I asked her to describe her.

She described a thin girl, age eleven, sitting at the kitchen table, watching her mother's face for the third year. The girl had decided, on a particular Tuesday, that she would never again be the one waiting. R. started to cry. Not the crying of grief — the crying of recognition. She had not thought about that Tuesday in twenty-three years.

I said: the next time a partner goes silent, the one who will want to leave is not you. It is her. She is eleven. She cannot drive. Do not let her drive.

R. laughed. It was a real laugh — the kind that comes after a long held breath.

We did not do a ritual. We did not do a healing exercise. We named the structure. We located the original decision. We agreed that the next time the trigger fired, she would do one thing before acting: she would ask, internally, *who in me is wanting to leave right now?* If the answer was the eleven-year-old, she would wait seventy-two hours before any decision. If, after seventy-two hours, the adult still wanted to leave, she could leave. But the eleven-year-old would not be allowed to drive.`,

    shift: `R. booked a follow-up six weeks later. She told me, in the first five minutes, that she had not needed it.

Three weeks after our session she had started seeing someone. A man she had known casually for two years. By the second week of dating, the familiar trigger had arrived. A Thursday evening. He had answered a text twenty minutes later than his usual pattern. She had felt the tightness in her chest. She had felt the thought arrive: *he is going to leave.*

She had done the thing we agreed on. She had asked: who in me is wanting to leave? The answer had been immediate. The eleven-year-old. She had not left. She had not texted anything decisive. She had gone to bed.

On Friday morning the tightness was still there. She had gone to work. The man had texted at noon, casual, asking about her evening. The tightness had begun to thin. By Sunday it was gone. They had seen each other Sunday night. He had been warm. He had been present. The relationship had continued.

This was, by her own account, the first time in her adult life she had let a trigger fire and pass without acting on it.

She said something else, which is the thing I want to record. She said the hum had changed. Not gone — changed. It used to feel like a phone ringing in another room. Now it felt like a notification she had decided not to open. She knew it was there. She was not pretending otherwise. But she was no longer obeying it.

The pattern had not been cured. The Moon-Ketu conjunction is still in her chart. Saturn still aspects it from the seventh. The eleven-year-old is still in her. The trigger will fire again. What has shifted is the relationship between the trigger and the action. There is now a space between them — a seventy-two-hour space — and in that space an adult can be present.

I asked her what she had learned. She said: "I learned that I am not afraid of being left. I am afraid of being left the way my mother left — without warning, without explanation, without me being allowed to grieve. Every partner I have ever had was being punished for something my mother did. The leaving was the punishment. The punishment was the pattern. The pattern was never about the men."

She paused. She said: "It was about a Tuesday when I was eleven."

I told her the work from here was simple. Not easy — simple. Every time the trigger fires, ask who is wanting to leave. If it is the eleven-year-old, wait seventy-two hours. If, after seventy-two hours, the adult still wants to leave, leave. The adult is allowed to leave. The eleven-year-old is not allowed to drive.

She said she understood. She said she would book another session if the structure changed — if the trigger started firing in new ways, or if the seventy-two-hour window stopped being enough. She did not book another session that day. She did not need to.

Three months later she sent a one-line email. The relationship was still going. The trigger had fired twice more. Both times she had waited. Both times the adult had decided to stay. She said: "I am, for the first time in my life, in a relationship with someone who is not being asked to repair my mother."

That is the shift. Not the absence of the pattern — the presence of a witness to it. The chart located it. The session named it. The body recognised it. The action changed. The pattern remains. The life is different.`,
  },

  // ───────────────────────────────────────────────────────────────────────
  // Case 2 — M., 41 — The marriage that stayed because the pattern was named
  // Pattern: the-rescuer
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "m-41-the-marriage-that-stayed-because-the-pattern-was-named",
    title: "The marriage that stayed because the pattern was named",
    pattern: "the-rescuer",
    clientInitials: "M.",
    clientAge: 41,
    consentGiven: true,
    problem: `M. came in to decide whether to leave her marriage. She had been asking the question for two years. She had a therapist. She had a journal. She had a list, in her phone, titled "Reasons to stay / Reasons to go." The list was 47 items long on each side. She had read it every Sunday morning for fourteen months. The decision had not clarified.

She had married at twenty-nine. Her husband was, by her description, a good man who had become a difficult partner. He had lost a business at thirty-four and had not worked steadily since. He was not abusive. He was not addicted. He was, in her words, "stuck." He spent his days in the house. He had projects that he started and did not finish. He had plans that he described in detail and did not enact. He had been mildly depressed for seven years and had refused, repeatedly, to seek help.

M. had spent those seven years trying to rescue him. She had found therapists and made appointments he did not keep. She had found business opportunities and presented them in folders he thanked her for and never opened. She had researched his depression, his sleep, his diet, his father's history of similar stuckness. She knew his pattern better than he did. She had told him, more than once, exactly what was wrong with him and exactly what he needed to do. He had agreed with her, each time, and changed nothing.

She was exhausted. She was also, in a way she could not name, unwilling to leave.

She told me she had come for the chart because she wanted permission. She wanted the chart to tell her what to do. She wanted an external authority to take the decision off her shoulders. She said: "I have been the one deciding everything in this marriage for twelve years. I am tired of deciding. I want the chart to decide."

I told her the chart does not decide. The chart shows the structure. The decision stays with her. She said she understood. She booked the session anyway.`,

    patternSection: `M.'s chart showed the rescuer signature in unusually pure form. Venus in the seventh house, conjunct Mars, both receiving a square from Neptune in the tenth. Jupiter in the sixth, aspecting the seventh. The Moon in Pisces in the eighth, conjunct the South Node (Ketu's counterpart — Rahu).

The Venus-Mars conjunction in the seventh is the chart of a person whose love and will are fused at the level of partnership. She does not love her partner and then act on his behalf. She loves her partner *through* acting on his behalf. The action is the love. The rescuing is not a behaviour she performs in the relationship — it is the relationship, as she understands it.

The Neptune square from the tenth house is the idealism overlay. Neptune dissolves what it touches. Squaring Venus-Mars, it means: she does not see the partner clearly. She sees the partner's potential. She has married, in a real sense, not the man in front of her but the version of him she has been keeping alive in her mind since the first year. The real man — stuck, refused help, agreed and changed nothing — has been invisible to her for seven years. She has been rescuing a different man.

Jupiter in the sixth aspecting the seventh is the service overlay. Jupiter expands what it touches. In the sixth house of service and daily routine, aspecting the seventh house of partnership, it produces a person whose sense of meaning is wired to being useful to her partner. She does not just want to help. She needs to help. When she is not helping, she does not know who she is in the relationship.

The Moon in Pisces in the eighth, conjunct Rahu, is the deepest layer. The Moon in Pisces is a sponge — it absorbs the emotional state of the people around it, particularly the partner. In the eighth house, it absorbs specifically the partner's stuckness, grief, unprocessed pain. Conjunct Rahu, it does this obsessively. M. is not just empathetic to her husband's depression. She is, at a nervous-system level, *running* his depression. She has been processing his unprocessed grief for seven years, in her own body, and calling it her exhaustion.

This is the rescuer pattern in its full architecture. It is not a personality trait. It is a structure with three layers:

1. **The love-is-action layer** (Venus-Mars seventh): I rescue because that is how I love.
2. **The idealism layer** (Neptune square): I rescue the potential, not the person.
3. **The absorption layer** (Moon-Rahu eighth): I take his state into my body and process it for him.

When all three layers are active, the rescuer cannot leave. Leaving would mean: giving up the action that is her love (layer 1), giving up the idealised version of him she has been keeping alive (layer 2), and giving up the absorption that gives her nervous system its purpose (layer 3). Leaving, for this chart, is not a decision. It is a kind of death.

This is why the 47-item list could not produce a decision. The list was the work of her conscious mind. The conscious mind wanted to leave. The chart, and the body, did not. The conscious mind was not strong enough to override three layers of pattern simultaneously. No amount of journaling was going to resolve a structural question.

The pattern, named this way, changed the question. The question was no longer "should I leave?" The question was: "which of these three layers am I willing to give up first?" Because the marriage could not stay the same. But it also could not be left from the place she was trying to leave it from. She would have to leave from a different layer of herself, or she would have to stay in a different way.

The chart did not decide. The chart re-framed. That is what the chart does.`,

    session: `M. had come expecting a verdict. I gave her the structure. I showed her the three layers. I told her, plainly, that the chart was not going to tell her whether to leave — because the part of her that wanted to leave was not the part of her that was keeping her there.

She was quiet for a long time. Then she said: "I knew that. I have known that for two years. I just didn't want to admit it."

I asked her what she had been afraid to admit. She said: "That I don't actually want to leave. That what I want is for the marriage to be different. And that I have been keeping it the same, by rescuing him, for seven years."

I asked her what she thought would happen if she stopped rescuing.

She said, immediately: "He would either sink or swim. I don't know which. I have been too afraid to find out."

I asked her what she was afraid of. She said: "I am afraid he would sink. I am afraid I would watch him sink. I am afraid I would not be able to bear watching him sink. And I am afraid that if he sank, it would mean I should have stayed and rescued him. And I am afraid that if he swam, it would mean I had been unnecessary for seven years."

I told her that last fear was the real one. She agreed.

I asked her to imagine, for a moment, that she was not necessary to her husband's survival. That he would, in fact, be fine without her rescuing. That he might, in fact, have been fine all along — that the rescuing had not been saving him, it had been keeping him stuck, because the rescuing was the structure he had adapted to.

She said: "That is the cruelest thing anyone has ever said to me."

I asked: "Is it true?"

She said, after a long pause: "Yes."

We sat with that for a while. Then I asked her to consider a thirty-day experiment. For thirty days, she would not rescue. She would not make appointments for him. She would not research his condition. She would not present opportunities. She would not describe his pattern to him. She would not, in any way, manage his stuckness. She would simply be present in the house with him, as a wife, not as a project manager.

She asked: "And what do I do with the energy?"

I said: "You find out who you are when you are not rescuing him. That is the work. The marriage is secondary. The question the chart is asking you is: who is M. when she is not being useful to a stuck man?"

She started to cry. Not the crying of grief. The crying of someone who has been asked a question they have been avoiding for a decade.

She agreed to the experiment. She did not commit to leaving. She did not commit to staying. She committed to thirty days of not rescuing, and to watching, carefully, what arose in her when she stopped.`,

    shift: `M. came back five weeks later. She had done the thirty days. She had also, on day twenty-two, broken the experiment — she had found a therapist for her husband, made the appointment, and told him about it. He had thanked her. He had not gone. She had been furious, then devastated, then relieved.

She said the relief was the part she could not explain. She said: "I broke the experiment, and the experiment still worked. Because I broke it on day twenty-two. Before, I would have broken it on day one. Before, I would not have even tried the experiment. The thirty days happened. Twenty-two of them. That is more space than I have had in seven years."

She said the twenty-two days had shown her something. On day nine, she had started drawing again. She had been an illustrator before the marriage. She had not drawn in eight years. She had not noticed she had stopped. On day fourteen, she had gone to a coffee shop alone on a Saturday and read a novel for three hours. On day seventeen, she had realised she did not actually want to leave the marriage. She had realised this on day seventeen, not day one, because she had needed the sixteen days before it to remember what it felt like to be a person who was not managing another person's life.

She said: "I do not want to leave. I want to stay. But I want to stay as the woman who draws, not the woman who rescues. And I do not know if the marriage can hold that woman. The marriage was built around the woman who rescues. The man I married may not recognise the woman who draws."

I asked her what she was going to do. She said she was going to do another thirty days. She was going to keep drawing. She was not going to tell her husband about the experiment — she had told him the first time, and that had been a mistake, because telling him had been a form of rescuing (managing his response to her change). This time she was just going to change, and let him notice, or not.

She came back eight weeks after that. Her husband had, on his own, made an appointment with a therapist. Not the one she had found. A different one. He had gone twice. He had not told her about it. She had found out by accident — she had seen the appointment in his calendar while looking for something else.

She said: "He is doing the thing I have been begging him to do for seven years. He is doing it the moment I stopped. I do not know whether to be relieved or furious."

I asked: "What are you?"

She said: "Both. And also — for the first time in twelve years — interested in him. As a person. Not as a project."

That is the shift. The marriage did not end. The pattern did. The rescuing stopped, and the man who had been stuck for seven years began, slowly, to move. Not because he was rescued. Because the rescuing had been the structure he was stuck inside of, and when the structure was removed, he had to find his own structure. He is still finding it. She is still drawing.

The chart did not decide. The chart named the structure that was keeping the question alive. Once the structure was visible, the question changed. The new question — "who am I when I am not rescuing?" — produced a different life. The marriage stayed. The marriage is not the same marriage.

M. told me, in her last session, that she had deleted the 47-item list. She said: "The list was the rescuer trying to manage her own leaving. I am not managing anymore. I am drawing. I will see what happens."`,
  },

  // ───────────────────────────────────────────────────────────────────────
  // Case 3 — A., 38 — When the control pattern cracks
  // Pattern: the-controller
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "a-38-when-the-control-pattern-cracks",
    title: "When the control pattern cracks",
    pattern: "the-controller",
    clientInitials: "A.",
    clientAge: 38,
    consentGiven: true,
    problem: `A. came in because his life was, by every external measure, exactly as he had designed it — and he could not sleep.

He was thirty-eight. He ran a profitable consulting practice he had built himself. He was married to a woman he had chosen carefully, dated for four years before proposing, and described as "the right partner on every axis I could measure." They had a four-year-old son. They lived in a flat he had spent two years selecting. His retirement was funded. His calendar was colour-coded. His assistant had been with him for nine years and had never made a mistake he had to correct twice.

He could not sleep.

He had been unable to sleep properly for fourteen months. He would fall asleep at midnight and wake at 3 a.m. He would lie in the dark, alert, his mind running. He had tried melatonin, magnesium, CBT-I, a sleep study, two therapists, an ayurvedic doctor, and a meditation retreat. Nothing had worked. The sleep study showed nothing wrong. The therapists had gently suggested his relationship with control might be relevant. He had listened politely, agreed intellectually, and continued not sleeping.

He came to the session sceptical. He told me, in the first five minutes, that he did not believe in astrology. He told me, in the next five, that he was there because a friend of his had come for a session a year ago and had described it as "the most precise diagnostic conversation of my life." A. wanted precision. He had run out of precise questions to ask the medical system. He was willing to try a different instrument.

He was clear about one thing. He did not want to be told to "let go." He had been told to let go by every therapist, every wellness practitioner, every friend he had spoken to about the insomnia. He told me, with some heat, that "letting go" was not a thing he could do — that the phrase was meaningless, that no one had ever been able to tell him what specific action it referred to, and that he had concluded it was a thing people said when they had nothing else to say.

I told him I agreed. I told him the chart does not say "let go." The chart shows what is being held, why it is being held, and what it would take to put it down. He said: "Good. That is what I want to know."`,

    patternSection: `A.'s chart was a textbook control architecture. Ascendant in Virgo. Sun, Mercury, and Venus all in the tenth house in Gemini. Saturn in the second house in Libra, aspecting the fourth (home), the eighth (fear), and the eleventh (network). Mars in Capricorn — exalted — in the fifth house, aspecting the eighth and the twelfth. Moon in Aquarius in the sixth, conjunct Ketu.

I will walk through each piece, because the architecture is the pattern, and the pattern is the architecture.

The Virgo ascendant is the diagnostician. It is the chart of a person whose primary orientation toward the world is to identify what is wrong, what is out of place, what could be improved. Virgo rising is not a flaw — it is a gift, when it is in service of something. The problem is when the diagnostician has nothing to diagnose. Then it turns on the self.

The triple conjunction in the tenth — Sun, Mercury, Venus in Gemini — is the public-facing competence. This is a person whose career is built on the ability to think, communicate, and relate at a very high level, all three fused. He does not have a work self and a personal self. The work self *is* the self. The tenth house is the house of reputation, career, public standing. Three planets there means: most of his energy is invested in the structure of his outer life. The outer life is, by every measure, excellent. That is not the problem.

Saturn in the second house, aspecting the fourth, eighth, and eleventh, is the control architecture. The second house is resources, family, what you hold. Saturn there is the part of the chart that says: *what you hold must be defended.* Saturn aspects the fourth (home — he spent two years selecting the flat because the home must be defended against imperfection), the eighth (fear — Saturn aspecting the eighth is the part of the chart that does not allow fear to be felt; it pre-empts fear by controlling the conditions that might produce it), and the eleventh (network — his friendships are curated, his assistant has been with him nine years, his wife was selected on measurable axes). Saturn in the second, aspecting those three houses, is the architecture of a life designed so that nothing unexpected can reach the centre.

Mars exalted in Capricorn in the fifth, aspecting the eighth and twelfth, is the executor. Mars exalted in Capricorn is Mars at its most disciplined — the warrior who wins by strategy, not by force. In the fifth house (children, creativity, joy), aspecting the eighth (fear) and the twelfth (sleep, the unconscious, what is hidden), it means: the discipline that built his life is also aimed at his own interior. He is executing strategy on his own fear. He is executing strategy on his own sleep. The meditation retreat, the magnesium, the CBT-I — these are all Mars in Capricorn in the fifth, trying to *solve* the eighth and twelfth from the outside.

This cannot work. The eighth and twelfth are not problems to be solved. They are the parts of the chart that operate by being allowed, not by being managed.

And then the Moon. The Moon in Aquarius in the sixth, conjunct Ketu. This is the key.

The Moon is the emotional body. In Aquarius, it is detached, observant, slightly above the fray — the emotional style of a person who processes feeling by understanding it, not by having it. In the sixth house of daily routine and health, it means: the emotional life is being routed through the body's maintenance schedule. He does not feel his feelings. He diagnoses them, schedules them, optimises them. Conjunct Ketu — the same Ketu that cuts — it means: the emotional body was severed from its natural expression early, and the routing through the intellect is the compensation.

The Moon-Ketu in the sixth, combined with the Saturn-aspected eighth, is the insomnia.

The insomnia is not a medical problem. The insomnia is the part of his chart that has refused to be managed. Saturn has controlled the home, the network, the fear. Mars has controlled the creativity, the children, the daily practice. But sleep is a twelfth-house matter — it happens when the conscious mind lets go, when the controlled self steps aside. Mars aspecting the twelfth is trying to control the letting-go. You cannot control the letting-go. That is the contradiction. That is the 3 a.m. waking.

The chart says: he is not sleeping because sleeping requires a surrender that his chart has been built, since childhood, to prevent.

This is not "let go." This is the specific architecture of why letting go is impossible from inside the structure, and what the structure is protecting.`,

    session: `I did not soften it. A. had asked for precision. I gave him the architecture in the order I have just described it. I showed him the chart. I walked him through each placement. I told him the insomnia was not a medical problem. I told him it was the part of his chart that had refused to be managed.

He listened. He did not interrupt. At the end, he said: "That is the most useful thing anyone has said to me about this in fourteen months."

I asked him what had landed. He said: "The part about Mars in Capricorn trying to control the letting-go. That is exactly what I have been doing. I have been trying to execute on sleep. I have been treating 3 a.m. as a problem to solve. It is not a problem to solve. It is the part of me that is refusing to be solved."

I asked him where he thought the refusal was coming from.

He was quiet for a while. He said: "I do not know. I have never asked. I have only ever tried to override it."

I asked him what he was afraid would happen if he did not override it. If, at 3 a.m., instead of getting up and reading or working or doing a breathing exercise, he simply lay there and let the 3 a.m. be what it was.

He said, immediately: "I would have to feel something."

I asked what.

He said: "I do not know. I have not let myself find out."

I told him that was the experiment. For the next fourteen days, when he woke at 3 a.m., he was not to get up. He was not to do a breathing exercise. He was not to read. He was not to meditate. He was to lie in the dark and let the 3 a.m. be what it was. If feeling arose, he was to let the feeling be there. If thoughts arose, he was to let the thoughts be there. He was not to diagnose, optimise, or solve. He was, in short, to do the opposite of everything his chart had been built to do.

He said: "That sounds unbearable."

I said: "Yes. That is the point. The unbearable is what the control has been built to avoid. The unbearable is not dangerous. It is just unbearable. There is a difference."

He asked: "What if the feeling is something I cannot handle?"

I said: "The chart says you can handle it. The Moon-Ketu in the sixth means your emotional body learned, very early, to route feeling through the intellect because the feeling was too big for the child to hold. You are no longer the child. The feeling is the same size. You are larger. You can hold it now. You have been telling yourself you cannot, because the child could not. The child is no longer here."

He was quiet for a long time. He said: "I will do the fourteen days."

I asked him to keep a single sheet of paper by the bed. Each morning, one line: how long he lay there, and one word for what arose. Not a journal. Not a process. A line.`,

    shift: `A. came back sixteen days later. He had done the fourteen days. He had also done the fifteenth, because he had not wanted to stop.

He had slept through the night twice in the first week. Once in the second. He had not slept through the night before the session in fourteen months. He was clear that the sleeping-through was not the point. The point was what had happened in the 3 a.m. hours he had not slept through.

He showed me the sheet of paper. Fourteen lines. The words, in order, were:

1. *Rage*
2. *Rage*
3. *Grief*
4. *Nothing*
5. *Grief*
6. *Father*
7. *Nothing*
8. *Nothing*
9. *Fear*
10. *Relief*
11. *Nothing*
12. *Grief*
13. *Father*
14. *Nothing*

He said the third night had been the worst. He had woken at 3 a.m. and felt a grief so large he had been certain, for a moment, that he was dying. He had not died. He had lain there for ninety minutes. The grief had not resolved. It had simply, eventually, thinned. He had got up at 5 a.m. and made coffee. He had gone to work. The day had been normal. The grief had not killed him.

He said: "I have spent twenty years believing that if I let myself feel that, I would not survive. I survived. The belief was wrong. The belief was the child's. The child was correct — the grief was too big for the child. I am not the child."

On the sixth night, the word "father" had appeared. He did not want to talk about it in detail. He said: "My father was a controlled man. He died of a heart attack at fifty-four. He never spoke about what was in him. I had decided, at fifteen, that I would not be him. I have spent twenty-three years being not-him by controlling everything he could not control. I became him anyway. The control *is* him. The control is what I inherited."

On the thirteenth night, "father" appeared again. This time he had lain there and said, internally, to the version of his father he had absorbed: *you do not have to hold this anymore. I will hold it. Differently.* He said the grief had moved, then. Not gone — moved. From his chest to his throat to his eyes. He had cried, briefly, at 4 a.m., for the first time since his father's funeral twenty-three years ago. Then he had slept.

The insomnia did not disappear. He still wakes at 3 a.m. some nights. But the 3 a.m. is no longer a problem to be solved. It is a time of night when something true is sometimes available, if he is willing to lie there and let it come. The control architecture is still in his chart. Saturn still aspects the eighth. Mars still aspects the twelfth. But the relationship to those placements has changed. He is no longer at war with the parts of himself that do not respond to strategy.

He told me, in the last session, that his consulting practice was unchanged. His marriage was unchanged. His flat was unchanged. His calendar was still colour-coded. None of the external architecture had to be dismantled. What changed was the interior. The 3 a.m. is no longer being managed. It is being allowed. And the allowing — not the managing — is what produces sleep.

He said: "I was not wrong to build the life I built. The architecture is not the problem. The problem was that I was using the architecture to avoid the room I had not entered. The room was not empty. There was something in it. I have been in it now. It is bearable. It was always bearable. I had just never stayed long enough to find out."

That is the shift. Not the dismantling of the control pattern — the encounter with what the control pattern was protecting. Once the encounter happens, the control does not need to disappear. It needs to stop being the only room. There are now two rooms. The controlled room, which runs the life. And the 3 a.m. room, which holds what the controlled room cannot. Both rooms exist. Both are his. The sleep comes when the controlled room agrees to be quiet long enough for the other room to be entered.`,
  },
];

/**
 * Get a seed by slug (used by /case-studies/[slug] when seeding is needed).
 */
export const CASE_STUDY_BY_SLUG: Record<string, CaseStudySeed> =
  Object.fromEntries(CASE_STUDY_SEEDS.map((c) => [c.slug, c]));
