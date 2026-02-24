# Content Creation Guide — Korean Learning App

This guide is for **AI and human contributors** who want to add new phrase content to the app.

## Quick Start

1. Create a new `.yaml` file in `src/data/raw_modules/`
2. Follow the schema below
3. Run `node scripts/build-data.js` to compile
4. Run `npm run dev` to preview

---

## File Location

All content files live in:

```
src/data/raw_modules/
├── basics.yaml          # example module
├── concert_vibes.yaml   # you'd add new ones here
└── ...
```

Each `.yaml` file = **one playlist/module** in the app.

---

## YAML Schema

```yaml
# ─── Module Metadata ───
id: unique_snake_case_id        # REQUIRED. Used as filename and internal key.
title: "Human Readable Title"   # REQUIRED. Shown on the playlist card.
theme: "K-Pop Live"             # Free-form tag. Shown on the card.
difficulty: "Beginner"          # Free-form string. See notes below.

# ─── Phrases ───
phrases:
  - id: p1                      # REQUIRED. Unique within this module.
    korean: "너무 예뻐요"          # REQUIRED. The full Korean phrase as a single string.
    translations:
      en:
        intent: "Natural English translation"
        literal: "Word-for-word English translation"
      ja:
        intent: "自然な日本語訳"
        literal: "逐語訳"
    blocks:                      # Each block = one "word unit" in the Korean sentence.
      - id: p1_b1               # REQUIRED. Unique within this module. Convention: {phrase_id}_b{n}
        surface: "너무"          # REQUIRED. The Korean text as it appears in the sentence.
        dictionary: "너무"       # REQUIRED. Dictionary/base form. Used for cross-referencing.
        type: adverb             # REQUIRED. See supported types below.
        meanings:
          en: "too much / very"
          ja: "とても / あまりにも"
        grammar_notes:           # OPTIONAL. Only include when there's something worth explaining.
          en: "Explanation in English"
          ja: "日本語での説明"
        space_after: true        # REQUIRED. Whether a space follows this block visually.
```


## Field Reference

### Module-Level Fields

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `id` | ✅ | string | Unique, snake_case. Becomes the JSON filename. |
| `title` | ✅ | string | Display name on the playlist hub. |
| `theme` | ✅ | string | Free-form. Examples: `General`, `K-Pop Live`, `Fan Letters`, `Daily Life` |
| `difficulty` | ✅ | string | Free-form. The app color-codes `Beginner` (green), `Intermediate` (yellow), `Advanced` (red). Anything else displays in default color. This is a work in progress — use your best judgment. |

### Phrase-Level Fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | ✅ | Convention: `p1`, `p2`, ... Unique within the module. |
| `korean` | ✅ | The full Korean phrase as a single string for readability. |
| `translations.en.intent` | ❌ | Natural English equivalent. Optional — JA is the default. |
| `translations.en.literal` | ❌ | Closer to the Korean word order/meaning. Optional. |
| `translations.ja.intent` | ✅ | Natural Japanese equivalent. |
| `translations.ja.literal` | ✅ | Closer to the Korean word order. |

> [!NOTE]
> **JA-only is the default.** English translations are optional and can be added later. When English is missing, the app automatically falls back to the Japanese translation. Types remain in English in the YAML (`type: verb`).

### Block-Level Fields (Word Units)

| Field | Required | Notes |
|-------|----------|-------|
| `id` | ✅ | Convention: `{phrase_id}_b{n}` (e.g. `p3_b2`) |
| `surface` | ✅ | Exact Korean text as used in the phrase (conjugated form). |
| `dictionary` | ✅ | Base/dictionary form. This powers cross-referencing across modules. |
| `type` | ✅ | Must be one of the supported types listed below. |
| `meanings.en` | ❌ | English meaning. Optional — include when convenient. |
| `meanings.ja` | ✅ | Japanese meaning (primary). |
| `grammar_notes.en` | ❌ | Explain conjugation, particles, or grammar patterns. Optional. |
| `grammar_notes.ja` | ❌ | Same in Japanese. |
| `space_after` | ✅ | `true` if a space follows this word, `false` for the last word or attached particles. |

---

## Important Rules

### How to segment blocks

A "block" is a **semantic word unit**, not necessarily a single word. Particles are typically attached to their noun:

```yaml
# CORRECT — particle attached to noun
- surface: "한국에"        # 한국 + 에 grouped together
  dictionary: "한국"
  type: noun

# CORRECT — compound verb as one unit
- surface: "보고싶어"      # 보다 + 고 싶다 conjugated as one
  dictionary: "보고싶다"
  type: verb
```

When in doubt, group particles with their preceding word. If a grammar point is worth explaining, use `grammar_notes` to break it down.

### The `dictionary` field is critical

This field powers cross-referencing. When a user clicks a word, the app finds **all phrases across all modules** that share the same `dictionary` value. So:

- Use the **standard dictionary form** (e.g. `하다` not `해`, `먹다` not `먹었어`)
- Be consistent. If one phrase uses `보다` as the dictionary form, all other occurrences of 보다 conjugations should too.
- For compound expressions like `보고싶다`, keep it as-is if you want it to cross-reference as a unit.

### The `type` field

The following **11 types** are supported. Each has a corresponding syntax color in the app:

| Type | Color | When to Use |
|------|-------|-------------|
| `noun` | 🔵 Blue | General nouns (사람, 학교, 밥) |
| `verb` | 🔴 Red | Action/state verbs (가다, 먹다, 있다) |
| `adjective` | 🟢 Green | Descriptive verbs / adjectives (예쁘다, 크다, 좋다) |
| `adverb` | 🟡 Yellow | Adverbs (너무, 잘, 항상, 빨리) |
| `pronoun` | 🟣 Purple | Pronouns (나, 너, 우리, 여기, 거기) |
| `particle` | 🩵 Teal | Standalone particles when separated from their noun (은/는, 이/가, 을/를, 에서) |
| `interjection` | 🩷 Pink | Exclamations, fillers, response words (네, 아니요, 와!, 아이고) |
| `counter` | 🟠 Orange | Counters and counting units (개, 명, 잔, 번) |
| `determiner` | 🩵 Sky | Demonstratives and determiners (이, 그, 저, 몇, 어떤) |
| `conjunction` | 🟩 Lime | Conjunctions when used as standalone connectors (그리고, 하지만, 그래서) |
| `copula` | 🌹 Rose | Copular expressions (이다, 아니다) when used as the main predicate |

**Usage notes:**
- **Particles attached to nouns** should still be grouped with the noun as one block (type: `noun`). Use `particle` only when a particle appears as its own block.
- **이다/아니다** at the end of a sentence (e.g. 학생이에요) can use `copula`. When embedded in larger verb forms, use `verb`.
- When in doubt, choose the type that best helps the learner understand the word's role.

---

## Example: Creating a New Module

Create `src/data/raw_modules/fan_letters.yaml`:

```yaml
id: fan_letters
title: Fan Letter Phrases
theme: Fan Culture
difficulty: Beginner

phrases:
  - id: p1
    korean: "항상 응원하고 있어요"
    translations:
      en:
        intent: "I'm always cheering for you."
        literal: "I am always supporting you."
      ja:
        intent: "いつも応援してるよ。"
        literal: "いつもあなたを応援しています。"
    blocks:
      - id: p1_b1
        surface: "항상"
        dictionary: "항상"
        type: adverb
        meanings:
          en: "always"
          ja: "いつも"
        space_after: true
      - id: p1_b2
        surface: "응원하고"
        dictionary: "응원하다"
        type: verb
        meanings:
          en: "to cheer / to support"
          ja: "応援する"
        grammar_notes:
          en: "응원하다 + 고 있다 (-ing form)"
          ja: "응원하다 + 고 있다 (〜している)"
        space_after: true
      - id: p1_b3
        surface: "있어요"
        dictionary: "있다"
        type: verb
        meanings:
          en: "to be (auxiliary for -ing)"
          ja: "いる (進行形の補助動詞)"
        space_after: false
```

---

## Medium-Level Rules: Content Quality & Phrasing

When authoring new phrases, follow these structural guidelines to ensure a high-quality learning experience.

### 1. The 5-Level Difficulty System
We use a 1-5 difficulty scale for modules, based generally on phrase length and grammatical complexity.
- **Level 1 (Novice)**: extremely short, standalone words or simple 1-2 word expressions. (e.g., "너무 예뻐요" - So pretty)
- **Level 2 (Beginner)**: basic complete sentences, simple subject-verb-object structures, 3-5 blocks. (e.g., "오늘 뭐해?" - What are you doing today?)
- **Level 3 (Intermediate)**: compound sentences (two clauses) with basic conjunctions/time phrases, 6-9 blocks. (e.g., "날씨가 추우니까 따뜻하게 입어" - It's cold today, so dress warmly)
- **Level 4 (Upper-Intermediate)**: complex multi-clause sentences, nuanced expressions, indirect quotations.
- **Level 5 (Advanced)**: advanced idioms, news/formal phrasing, rare vocabulary, rapid-fire native speech.

*Note: Update the module-level `difficulty` field to one of these levels (e.g., `difficulty: "Level 2"`).*

### 2. Sentence Completeness & Standalone Meaning
Every phrase added to the app must be a **complete, standalone unit of thought**.
- **Do not cut sentences into unnatural fragments** just to fit them into the app. 
- If a learner reads a phrase by itself, it should make complete sense on its own. If it relies heavily on the previous or next line to be understood (like chopped-up song lyrics), it should be grouped into a single phrase block.

### 3. Natural & Authentic Korean (The "Anti-Textbook" Rule)
We want to teach Korean as it is actually used in the real world.
- **Avoid unnatural, overly rigid "textbook" Korean** unless it specifically fits the context (e.g., a formal news broadcast module).
- It is perfectly fine—and preferred—for a sentence to be grammatically "incomplete" (e.g., dropping subjects like "I" or "You", omitting standard particles) **as long as it is a natural, standalone utterance in that context.**
- Phrases should reflect the **cultural texture** of their module. A "Fan Culture" module should use natural casual internet slang, while a "Business Email" module should use appropriate formal honorifics.

---

## High-Level Rules: Narrative & World-Building

Inspired by *DUO 3.0*, our phrases aren't isolated grammar exercises—they are glimpses into the lives of a small cast of recurring characters. This creates a vague, rewarding sense of continuity without requiring an explicit storyline.

### 1. The Implicit Cast
When writing phrases, imagine they are spoken by, directed at, or about our core characters (see **Character Sheet** below). You don't need to name them every time—the *voice*, *tone*, and *situation* should hint at who is involved.

### 2. Micro-Storytelling
A single phrase should hint at a larger situation. Phrases with personality and context are far more memorable than neutral ones.
- *Neutral (forgettable):* "I bought a computer."
- *With life (memorable):* "I shouldn't have bought such an expensive laptop with my part-time job money."

### 3. Callbacks & Continuity
It is encouraged to subtly reference events or situations from other modules. If an earlier module establishes that Minji lost her umbrella, a later module can have a phrase where she complains about buying a new one. Learners who notice these connections get rewarded with a sense of discovery.

### 4. Not Everything Is Dialogue
Phrases don't always have to be spoken by a character or be internal monologue. They can also be:
- **Narration / description:** "The convenience store was already closed." 
- **Signs, announcements, or media:** "Next stop: Gangnam Station."
- **General wisdom or proverbs:** "You reap what you sow."

The cast exists to give *texture*, not to constrain. Let the situation dictate whether a character voice is appropriate.

---

## Character Sheet

A lightweight "show bible" for content contributors. These characters are intentionally vague—just enough personality to inspire varied, natural phrases.

### Jiho (지호) — The Broke University Student
- **Age:** Early 20s
- **Vibe:** Earnest, slightly clumsy, perpetually tired and broke.
- **Life:** Studies something vaguely humanities-related. Works a part-time job at a convenience store. Survives on ramen and iced americanos.
- **Role in phrases:** Daily struggles, student life, part-time job complaints, food, sleep deprivation, awkward social moments.
- **Speech style:** Casual 반말 with friends, polite 존댓말 at work and with strangers. Sometimes dramatic about small things.
- **Notable trait:** Huge fan of Yuna (유나). Watches her performances during breaks.

### Minji (민지) — The Competent Office Worker
- **Age:** Late 20s
- **Vibe:** Capable, slightly sarcastic, warm underneath the bluntness.
- **Life:** Works at a company. Commutes by subway. Gives advice whether you asked for it or not.
- **Relationship:** Jiho's older sister (or close 언니/누나-type friend). Worries about Jiho but shows it through nagging.
- **Role in phrases:** Work stress, adulting, giving advice, coffee dependency, subway commute, weather complaints.
- **Speech style:** Mix of casual and polite depending on context. Direct and efficient.

### Sam (샘) — The International Friend
- **Age:** 20s
- **Vibe:** Enthusiastic, curious, cheerfully lost in translation.
- **Life:** An international student or someone living in Korea. Korean is decent but not perfect. Often ends up in funny cultural misunderstandings.
- **Role in phrases:** Asking questions, travel situations, language-learning struggles, cultural observations, ordering food, navigating daily life as a foreigner.
- **Speech style:** Polite Korean (trying hard), sometimes accidentally funny. Mixes up similar-sounding words occasionally.

### Yuna (유나) — The K-Pop Idol
- **Age:** Early-to-mid 20s
- **Vibe:** Bright, hardworking, beloved by fans. Seen only through media—never interacts with the main three directly.
- **Life:** Member of a fictional girl group. Appears on variety shows, posts on social media, does V-Lives. Jiho is a devoted fan.
- **Role in phrases:** Fan culture vocabulary, social media posts, idol interview speech, song lyrics context, fan letters. Also useful for polite/broadcast-level Korean.
- **Speech style:** Public-facing 존댓말, warm and bubbly with fans. Occasionally posts casual 반말 on social media late at night.
