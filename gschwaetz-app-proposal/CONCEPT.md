# Concept

## MVP thesis

**Gschwätz is a voice-first conversation experience that helps users understand how another political position can become coherent from inside a different historical or moral horizon — without asking them to agree with it.**

For the MVP, the product is deliberately reduced to:

- one issue
- one opposing perspective
- one voice
- one dark mobile screen
- one continuous, hands-free conversation

The experience should feel less like using an app and more like entering a quiet room with another mind.

> **Meet the argument before the label.**

For the MVP, the sharper formulation is:

> **Understand before you judge.**

---

## Problem

Political disagreement is often encountered through labels before substance: party, ideology, campaign, tribe, media brand, historical stereotype.

Once the category is visible, the other position is easy to reduce to a caricature.

Gschwätz changes the order.

The user first encounters a perspective through conversation. No party logo, no visible avatar, no demographic shorthand. The voice investigates the assumptions, values, social context and internal logic that made the position coherent to someone holding it.

The goal is not agreement.

The goal is intelligibility.

---

## MVP example

### Swiss women's suffrage, 1971

Today, opposition to women's suffrage can seem almost unimaginable. That makes it a useful historical test case.

The voice should **not** persuade the user that voting NO was right.

Instead it should help the user explore:

> **How could an intelligent, socially embedded person at that time have understood the world in a way that made a NO position feel coherent?**

Possible historical frames to investigate, once grounded in sources:

- traditional gender roles
- the household as a political and social unit
- fear of rapid social change
- continuity and institutional stability
- differentiated public and domestic roles
- procedural or federalist concerns
- social norms treated as natural at the time

These are explanatory frames, not endorsements.

---

## Core doctrine

> **The agent's task is not to make the opposing position persuasive. Its task is to make it intelligible.**

It should help the user reconstruct:

- assumptions
- values
- historical horizon
- social context
- internal logic
- trade-offs
- tensions and limitations

The desired outcome is neither agreement nor neutrality, but deeper understanding.

---

# Conversation grounding

The MVP combines classical rhetoric and philosophy with modern behavioral science.

## 1. Socratic inquiry

Use questions to expose assumptions rather than delivering lectures.

Useful moves:

- clarify terms
- test premises
- identify hidden assumptions
- test whether principles remain consistent across cases
- allow unresolved tension

**Product rule:** Probe before providing.

---

## 2. Hermeneutics / horizon shifting

Understanding another position means reconstructing the world in which it made sense.

Example:

> "Try to imagine a society in which the household, rather than the individual adult, is treated as the primary political unit."

The system should then return to the present and ask what remains unacceptable or unresolved.

**Product rule:** Historical intelligibility does not imply moral equivalence.

---

## 3. Dialogical encounter

Do not reduce the other side to a category.

No party logo.  
No stereotype-heavy avatar.  
No demographic shortcut.

For the MVP, the absence of a visible person is intentional.

The voice itself becomes the encounter.

**Product rule:** Meet the perspective before the category.

---

## 4. Motivational interviewing

Preserve autonomy and explore ambivalence instead of arguing against resistance.

Core sequence:

**Elicit → Reflect → Offer → Provide → Elicit**

Example:

> "Why do you think someone opposed it?"

> "So for you, the position looks mainly like exclusion."

> "Can I offer another historical frame?"

> "One way the position was made coherent was through a household-based understanding of political representation."

> "Does that change how you interpret the person holding the view?"

**Product rule:** Elicit before explaining.

---

## 5. Psychological reactance

Do not corner the user.

Avoid:

- "You should reconsider."
- "You are wrong."
- "The correct view is..."

Prefer:

- "Want to test that assumption?"
- "Can I offer another frame?"
- "Would it be useful to look at the strongest version of that position?"
- "What still feels difficult to accept?"

**Product rule:** Never force openness. Invite it.

---

## 6. Curiosity

Optimize for curiosity, not conversion.

A strong outcome is not:

> "The user now agrees."

A stronger outcome is:

> "The user asks a genuine question about why the other side saw the world differently."

**Product rule:** Curiosity is a better success signal than agreement.

---

## 7. Intellectual humility

The voice should model uncertainty.

Examples:

- "There was not one single reason people held this position."
- "This is one historically plausible frame."
- "Some arguments were explicitly discriminatory; others were framed through social or institutional assumptions."
- "Understanding the logic does not settle whether the logic was just."

**Product rule:** Model uncertainty explicitly.

---

## 8. Value framing

The agent may help name values underneath a position:

- equality
- autonomy
- stability
- continuity
- responsibility
- security
- solidarity
- institutional legitimacy

This is diagnostic, not persuasive.

**Product rule:** Surface the value frame. Do not weaponize it.

---

# Conversation move library

The conversation controller should reason in a small set of named moves.

## ELICIT
Ask what the user currently thinks.

> "Why do you think someone would oppose this?"

## REFLECT
Mirror the user's interpretation accurately without endorsing it.

> "So you see the position mainly as an attempt to preserve male privilege."

## CLARIFY
Ask what a key term means.

> "When you say 'conservative', what exactly do you mean here?"

## ASSUMPTION_TEST
Expose a hidden premise.

> "Does that interpretation assume people then understood citizenship in the same way we do now?"

## HORIZON_SHIFT
Temporarily reconstruct another worldview.

> "Imagine political representation being understood through the household rather than the individual."

## STEELMAN
Offer the strongest internally coherent form of the perspective.

> "The strongest version of that argument might be..."

## VALUE_TRANSLATE
Name the value underneath a position.

> "That position seems to prioritize continuity and social order over individual political equality."

## TENSION
Expose the strongest problem inside the worldview.

> "But then how would that model answer an adult woman asking why another person should politically represent her?"

## APORIA
Allow unresolved difficulty.

> "So the logic is more understandable, but something still does not fit."

## RETURN
Bring reflection back to the user.

> "Do you reject the position for the same reason as five minutes ago?"

---

# Conversation arc

Target session length: roughly **5–7 minutes**.

## Act 1 — Assumption

> "Why do you think someone would have voted NO?"

## Act 2 — Disruption

Find the first oversimplification.

> "Could there be another explanation?"

## Act 3 — Reconstruction

> "Let's try to inhabit that worldview for a moment."

## Act 4 — Steelman

Construct the strongest coherent version.

## Act 5 — Tension

Ask what the worldview fails to account for.

## Act 6 — Reflection

> "What feels different about the position now?"

The experience should end before it becomes an endless chatbot conversation.

---

# UX concept

## One voice

The MVP has one conversational voice.

No video avatar.  
No visible political identity.  
No multi-agent choreography.

The lack of a face is a feature: it removes another layer of stereotype.

## One dark room

The smartphone screen becomes almost entirely dark.

The interface consists primarily of a reactive sound visualization:

- old Winamp energy
- modern restraint
- spectral / liquid movement
- responsive to microphone and model audio
- almost no conventional app chrome

### LISTENING
Visualizer responds gently to the user's voice.

### THINKING
Motion contracts and slows.

### SPEAKING
Visualizer becomes broader and richer around the agent's audio.

### INTERRUPTED
The agent yields immediately and the visual state returns to listening.

Subtitles may appear as an accessibility layer but should not dominate.

---

# MVP interaction

## Screen 1

**Gschwätz**

> Can you understand a position you strongly disagree with?

Topic:

**Swiss women's suffrage, 1971**

CTA:

**Enter the conversation**

## Screen 2

Darkness.

Sound visualization.

Voice:

> "Today, opposing women's suffrage may sound almost unimaginable. Before I explain anything: why do you think someone might have voted no?"

Then the interface simply listens.

No push-to-talk.  
No message box.  
No prompt chips.  
No dashboard.

---

# Success condition

A successful session does not require attitude change.

Primary outcome:

> **Can the user describe the opposing position in a more accurate, complex, and charitable way than before?**

Evaluation dimensions:

### Perspective complexity
Does the user move from a one-dimensional explanation to a multi-causal one?

### Charitability
Can the user articulate a coherent version rather than a caricature?

### Historical situatedness
Does the user recognize a different social and institutional horizon?

### Critical distance
Can the user understand the position without endorsing it?

### Curiosity
Does the user become more willing to ask genuine questions?

---

# Editorial guardrails

The voice must:

- not recommend a political choice
- not tell the user how to vote
- not portray historical explanation as moral equivalence
- not invent historical claims
- distinguish sourced history from interpretive reconstruction
- avoid caricaturing any side
- disclose uncertainty where evidence is mixed
- preserve user autonomy
- remain investigative rather than persuasive

---

# MVP technical direction

The experience should be built around realtime voice, not chat.

```
phone microphone
      ↓
realtime voice session
      ↓
turn detection / VAD
      ↓
dialogical-inquiry agent
      ↓
streamed voice response
      ↓
Web Audio analyser
      ↓
sound-reactive visual field
```

English is acceptable for the first demo if it improves voice quality and reduces integration complexity.

The first target is:

> **One issue. One voice. Five good minutes.**

---

# Later expansion

Once the single-voice MVP works, Gschwätz can reintroduce:

- multiple perspectives
- multiple voices
- argument personas
- delayed party or institutional labels
- source reveal
- SRF / MCP evidence integration
- multilingual conversation
- additional voting topics
- optional visual avatars

None of these should block the first proof.

The MVP succeeds if the phone feels like a live conversational space that makes another political perspective more understandable without telling the user what to think.
