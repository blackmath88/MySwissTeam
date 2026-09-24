# Minimal architecture

## MVP stack

Frontend:

- Next.js / React or fast single-page app
- avatar cards
- text chat first
- optional browser speech-to-text / text-to-speech

Backend:

- one LLM endpoint
- persona JSON store
- source bundle per issue
- lightweight session state

Optional:

- live avatar / lip sync provider
- retrieval layer for source citations

## Suggested request flow

1. User opens issue.
2. App loads `issue.json` and 3 personas.
3. Hidden persona metadata remains server-side.
4. User chats with selected persona.
5. Backend sends only persona-safe fields to model.
6. Model returns grounded answer plus referenced claim IDs.
7. UI displays response.
8. Reveal mode unlocks source / political-origin metadata.

## Important separation

### Public conversation payload

Contains:

- persona name
- stance summary
- values
- reasons
- trade-offs
- uncertainty
- counterarguments

Does not contain:

- party names
- organisation names
- political-origin reveal metadata

### Reveal payload

Contains:

- source organisations
- links
- claim provenance
- party / group origin mapping
- synthesis explanation

This makes accidental early leakage easier to prevent.

## Suggested directory structure

```text
app/
  issues/
    ISSUE_ID/
      issue.json
      personas/
        lea.json
        jonas.json
        noura.json
      sources.json
  prompts/
  lib/
    chat.ts
    reveal.ts
    provenance.ts
  components/
    AvatarCard.tsx
    Conversation.tsx
    Reflection.tsx
    RevealPanel.tsx
```
