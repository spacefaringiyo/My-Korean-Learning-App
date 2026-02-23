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
        type: adverb             # REQUIRED. One of: noun, verb, adjective, adverb, pronoun
        meanings:
          en: "too much / very"
          ja: "とても / あまりにも"
        grammar_notes:           # OPTIONAL. Only include when there's something worth explaining.
          en: "Explanation in English"
          ja: "日本語での説明"
        space_after: true        # REQUIRED. Whether a space follows this block visually.
```

---

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
| `translations.en.intent` | ✅ | How a native speaker would naturally say it. |
| `translations.en.literal` | ✅ | Closer to the Korean word order/meaning. |
| `translations.ja.intent` | ✅ | Same as above, in Japanese. |
| `translations.ja.literal` | ✅ | Same as above, in Japanese. |

### Block-Level Fields (Word Units)

| Field | Required | Notes |
|-------|----------|-------|
| `id` | ✅ | Convention: `{phrase_id}_b{n}` (e.g. `p3_b2`) |
| `surface` | ✅ | Exact Korean text as used in the phrase (conjugated form). |
| `dictionary` | ✅ | Base/dictionary form. This powers cross-referencing across modules. |
| `type` | ✅ | Must be one of: `noun`, `verb`, `adjective`, `adverb`, `pronoun` |
| `meanings.en` | ✅ | English meaning (can use `/` for multiple meanings). |
| `meanings.ja` | ✅ | Japanese meaning. |
| `grammar_notes.en` | ❌ | Explain conjugation, particles, or grammar patterns. |
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

Only these five values are supported (they correspond to CSS color classes):

- `noun` — blue
- `verb` — red
- `adjective` — green
- `adverb` — yellow
- `pronoun` — purple

If a word doesn't cleanly fit (e.g. particles, copulas), choose the closest match or default to `noun`.

---

## Workflow After Editing

After creating or editing any `.yaml` file:

```bash
node scripts/build-data.js   # compiles YAML → JSON (manifest, search index, modules)
npm run dev                   # preview locally
```

When ready to deploy:

```bash
npm run deploy                # builds data + vite bundle + deploys to GitHub Pages
```

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
