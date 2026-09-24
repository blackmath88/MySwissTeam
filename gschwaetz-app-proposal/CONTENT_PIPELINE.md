# Content pipeline

## Goal

Transform public political source material into source-grounded argument personas without inventing party positions or creating caricatures.

## Pipeline

### 1. Collect sources

Priority order:

1. official referendum / legislative material
2. official party or campaign documents
3. interest group / civil society positions
4. high-quality research or policy analysis
5. reputable explanatory journalism

Every source receives a stable ID.

### 2. Extract claims

Each extracted statement is classified as:

- fact
- interpretation
- value judgment
- forecast / prediction
- policy preference

### 3. Build an argument graph

For each issue, represent:

- supporting reasons
- opposing reasons
- shared premises
- contested facts
- contested values
- trade-offs
- uncertainties

### 4. Build personas from clusters

Personas are not assigned directly from party names.

Cluster by:

- value priorities
- causal reasoning
- implementation concerns
- institutional assumptions
- risk tolerance

Then map each claim back to real sources.

### 5. Run steelman check

For every persona:

- Can it state the strongest opposing argument fairly?
- Does it acknowledge at least one real cost or uncertainty?
- Does it avoid mocking or pathologising opponents?

### 6. Run provenance check

Every political factual claim must have source references.

If no source supports a claim:

- remove it
- or mark it explicitly as interpretation

### 7. Generate conversational form

The LLM may paraphrase and adapt tone, but it must not alter claim meaning.

## Hard editorial rules

- No invented statistics.
- No fake quotations.
- No fake lived experience.
- No invented party positions.
- No inferred motives presented as facts.
- No covert recommendation.
- No ideological scoring of the user.
- No real-person impersonation.

## Provenance display

Claim-level reveal should distinguish:

- **Direct source position**
- **Synthesised perspective**
- **Model paraphrase**

Example:

> "This argument combines concerns found in the Federal Council explanatory material and the FDP position paper. The wording is AI-generated; the underlying claims are sourced."
