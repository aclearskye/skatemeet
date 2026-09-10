# SK8:MEET DESIGN SYSTEM

**Version 1.0 — Source of truth for all brand and UI decisions.**

Every screen, component, document, and piece of marketing material for Sk8:Meet derives from this file. If a value elsewhere disagrees with this file, this file wins. Update this file first, then propagate.

---

## 1. Brand principles

1. **Brutalist, not broken.** Sharp corners, heavy borders, hard shadows. Structure is visible and honest — nothing is softened to look "friendly."
2. **Dark is the canvas, neon is the reward.** Surfaces stay near-black; color is earned by the things that matter — progress, action, sponsorship, hype.
3. **DIY authenticity.** Duct tape, hazard stripes, mono labels. The system should feel like it was made by skaters with a label maker, not a corporate design team.
4. **Gamification is identity.** XP, trick ratings, and battles aren't features bolted on — components are designed around progression and competition first.
5. **Skaters ride free.** No visual pattern may ever imply a paywall for skaters. Sponsored surfaces are always explicitly labelled (see Duct Tape Label).

---

## 2. Color

### 2.1 Core tokens

| Token | Hex | RGB | Role |
|---|---|---|---|
| `--bg` | `#0A0A0A` | 10 10 10 | Page/app background. True near-black, never tinted grey. |
| `--surface` | `#151515` | 21 21 21 | Cards, panels, sheets, table headers. One step above bg. |
| `--surface-2` | `#1E1E1E` | 30 30 30 | Inset elements: bar tracks, input fields, code chips. |
| `--line` | `#2C2C2C` | 44 44 44 | Hairline dividers and dashed borders only. |
| `--ink` | `#F2F2F0` | 242 242 240 | Primary text and all structural borders. Warm off-white. |
| `--ink-dim` | `#9C9C96` | 156 156 150 | Secondary text, labels, captions, placeholders. |
| `--chartreuse` | `#D8F927` | 216 249 39 | **Primary accent.** CTAs, active states, XP, duct tape, prices. |
| `--chartreuse-dk` | `#B8D81F` | 184 216 31 | Second stripe in hazard fills only. Never used alone. |
| `--orange` | `#FF5C1F` | 255 92 31 | **Secondary accent.** Battles, warnings, streaks, alt tape. |
| `--cyan` | `#35E8FF` | 53 232 255 | **Tertiary accent.** Data, stats, links, fill-in slots, alt tape. |

### 2.2 Semantic aliases

| Alias | Points to | Used for |
|---|---|---|
| `--success` | `--chartreuse` | Trick landed, level up, saved |
| `--danger` | `--orange` | Destructive actions, errors, battle challenges |
| `--info` | `--cyan` | Stats, metadata, neutral notifications |

### 2.3 Color rules

- Text on any neon background is **always `#0A0A0A`**. Never white-on-neon.
- **One neon dominates per composition.** Chartreuse leads by default; orange and cyan support.
- No neon-on-neon pairings (e.g. cyan text on chartreuse).
- No pure `#FFFFFF` or pure `#000000` anywhere.
- No gradients, except the hazard stripe (see 5.2).
- Structural borders use `--ink`, never `--line`. `--line` is for internal dividers only.

### 2.4 Shadow

One shadow exists in the system:

```
box-shadow: 3px 3px 0 rgba(0,0,0,.55);
```

Hard offset, zero blur. Applied to duct tape labels and floating/pressed elements (toasts, dragged cards). Soft or blurred shadows are forbidden.

---

## 3. Typography

Three families, all from Google Fonts:

```
font-family: 'Anton', sans-serif;           /* --display */
font-family: 'Hanken Grotesk', sans-serif;  /* --body    */
font-family: 'Space Mono', monospace;       /* --mono    */
```

### 3.1 Roles

| Family | Weights | Case | Role |
|---|---|---|---|
| **Anton** | 400 only | ALWAYS UPPERCASE | Display: headlines, screen titles, stat numerals, level numbers, battle scores. Never body copy. |
| **Hanken Grotesk** | 400 / 600 / 700 | Sentence case | Body: paragraphs, descriptions, comments, settings. 600 for inline emphasis; 700 rare, urgency only. |
| **Space Mono** | 400 / 700 | UPPERCASE | Metadata: labels, eyebrows, tape, timestamps, usernames, XP counts, table headers, footers. 700 for tape and slots. |

### 3.2 Type scale

| Level | Family / weight | Size | Tracking / line-height |
|---|---|---|---|
| `display-xl` (h1) | Anton 400 | clamp(52px, 10vw, 104px) | 0.005em / 0.96 |
| `display-lg` (h2) | Anton 400 | clamp(28px, 4.5vw, 40px) | 0.01em / 1.1 |
| `display-md` (h3) | Anton 400 | 24px | 0.01em / 1.15 |
| `stat` | Anton 400 | clamp(30px, 5vw, 44px) | — / 1.0 · usually `--cyan` |
| `body-lg` | Hanken 400 | 18px | — / 1.55 |
| `body` | Hanken 400 | 15–16px | — / 1.55 |
| `body-sm` | Hanken 400 | 13.5–14px | — / 1.5 · usually `--ink-dim` |
| `label` | Space Mono 400/700 | 11–13px | 0.04–0.08em / 1.4 · UPPERCASE |

### 3.3 Type rules

- Max line length for body copy: **~66ch**.
- Anton line-height never exceeds 1.15.
- Space Mono labels never exceed 15px.
- Section eyebrows are Space Mono 13px `--ink-dim`, prefixed with `//` (e.g. `// SPONSORSHIP PRODUCTS`).

---

## 4. Structure & layout

| Token | Value | Notes |
|---|---|---|
| `radius` | **0 — global, no exceptions** | Enforce with `border-radius: 0 !important` in resets. |
| `border-heavy` | `2px solid var(--ink)` | Cards, tables, inputs, buttons. 3px under major section heads. |
| `border-light` | `1px solid var(--line)` | Internal dividers. |
| `border-accent` | `6px solid var(--chartreuse)` (left) | Callout panels. |
| `page-width` | max 880px, 24px side padding | Documents/web. App screens are full-bleed with 16–20px gutters. |
| `section-gap` | 80–88px | 48px in print. |
| `card-pad` | 20–24px | Internal element gaps 14–22px. |
| `grid-gap` | 18–22px | |
| `breakpoint` | 640px | Grids collapse to one column; right borders become bottom borders. |

Spacing follows a loose 4px base: prefer 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 88.

---

## 5. Signature elements

### 5.1 Duct tape label

The system's most recognisable mark. Used for status, category, and **every sponsored surface**.

- Space Mono 700 / 13px / 0.08em / UPPERCASE
- Padding `5px 14px`, text `#0A0A0A`
- Background + rotation variants: chartreuse `-1.5deg` (default), orange `+1.2deg`, cyan `-0.8deg`
- Shadow: `3px 3px 0 rgba(0,0,0,.55)`
- On cards, position overlapping the top border (`top: -13px; left: 18px`)

**Rule: any sponsored content carries a tape reading `SPONSORED`. No exceptions, no alternate wording.**

### 5.2 Hazard stripe (EXP fill)

The only permitted gradient:

```
background: repeating-linear-gradient(
  -45deg,
  var(--chartreuse) 0 12px,
  var(--chartreuse-dk) 12px 24px
);
```

Orange variant (battle contexts) swaps in `#FF5C1F` / `#D94A15`.

### 5.3 Fill-in slot

Placeholder for pending data in documents: Space Mono 700, `--cyan`, wrapped in square brackets — `[X,XXX]`. Replace before anything ships or is sent.

### 5.4 Accent callout

`--surface` panel, 6px chartreuse left border, Anton uppercase headline, Hanken `--ink-dim` body. Maximum one per section.

---

## 6. Components

Canonical specs for the app component library. All components: radius 0, `border-heavy` outlines, `--surface` backgrounds unless stated.

### 6.1 Buttons

| Variant | Recipe |
|---|---|
| **Primary** | Chartreuse bg, `#0A0A0A` text, Space Mono 700 13px UPPERCASE, padding `12px 20px`, 2px ink border. Press state: translate `2px,2px`, shadow removed. |
| **Secondary** | Transparent bg, 2px ink border, `--ink` text. Hover/press: `--surface-2` bg. |
| **Danger** | Orange bg, `#0A0A0A` text. Same geometry as primary. |
| **Ghost** | No border, Space Mono `--ink-dim`, underline on hover. Inline actions only. |

Labels say what happens: `DROP IN`, `SAVE SPOT`, `START BATTLE` — never `Submit`.

### 6.2 Inputs

`--surface-2` bg, 2px ink border, `--ink` text (Hanken 15px), placeholder `--ink-dim`. Focus: border becomes chartreuse. Error: border orange + Space Mono 12px orange message below. Field labels: Space Mono 12px `--ink-dim` UPPERCASE above the field.

### 6.3 EXP progress bar

Track 22px, `--surface-2`, 2px ink border. Fill = hazard stripe (5.2). Caption row above: Space Mono 12px — level/label left, `XP 1,240 / 2,000` right.

### 6.4 Trick rating card

`--surface` card, 2px ink border. Trick name Anton 24px UPPERCASE; difficulty as duct tape (chartreuse = clean, orange = gnarly); rating numeral Anton in `--cyan`; meta row (skater, spot, date) Space Mono 12px `--ink-dim`.

### 6.5 Feed card

Full-bleed media, 2px ink border. Profile chip top-left over media. Action row (rate / comment / share) as ghost buttons, Space Mono. Sponsored variant: `SPONSORED` tape top-right — mandatory (see 5.1). Frequency cap: never more than 1 sponsored card in 10.

### 6.6 Profile chip

Square avatar (no rounding), 2px ink border, username Space Mono 700 13px, level badge: chartreuse square with `#0A0A0A` Anton numeral.

### 6.7 Status badges

Tape-style but unrotated, no shadow: Space Mono 700 11px, padding `3px 10px`. Chartreuse `LANDED` · orange `IN BATTLE` · cyan `NEW SPOT` · `--surface-2` with `--ink-dim` text for neutral states.

### 6.8 Spot map card

`--surface`, 2px ink border. Spot name Anton 19px; distance + surface-type Space Mono 12px `--cyan`; claimed-shop variant carries chartreuse `SHOP` tape and one offer line.

### 6.9 Toast notifications

`--surface` bg, 2px ink border, hard shadow `3px 3px 0 rgba(0,0,0,.55)`, 6px left border in the semantic color. Message Hanken 15px; icon/label Space Mono. Auto-dismiss 4s, slide from top.

### 6.10 Bottom navigation

`--bg` bar, 2px ink top border, 5 slots. Icons stroke-style in `--ink-dim`; active tab: chartreuse icon + Space Mono 10px label. No pill indicators, no rounded highlights.

---

## 7. Motion

- Durations: 120ms (press), 200ms (state), 320ms (enter/exit). Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Movement is mechanical: translate and hard cuts, no bounces, no fades longer than 320ms.
- One orchestrated moment per screen max (e.g. XP bar filling on level-up).
- Respect `prefers-reduced-motion`: replace movement with instant state changes.

---

## 8. Voice & copy

- **Plain, active, short.** "Save spot", not "Your spot has been successfully saved to your collection."
- Skate vernacular welcome where natural (session, drop in, land, gnarly) — never forced.
- Errors say what broke and what to do next. No apologies, no vagueness.
- Empty states invite action: "No spots yet. Pin your first."
- Sponsored copy is reviewed to speak skate, not ad. Sponsors add something (prizes, discounts, events) or they don't run.

---

## 9. Accessibility

- Body text `--ink` on `--bg`/`--surface` and `#0A0A0A` on all neons meet WCAG AA. `--ink-dim` is AA at 14px+ on `--bg`; do not use it below 12px on `--surface-2`.
- Never rely on color alone — pair neon states with a label or icon.
- Focus states: 2px chartreuse border or outline on all interactive elements. Visible keyboard focus always.
- Tap targets minimum 44×44px despite compact visual style.

---

## 10. Governance

- This file is **v1.0** and the single source of truth.
- Change process: update this file → bump version → propagate to token files/CSS variables → update asset library, media kit, and theme sheet.
- Derived documents to keep in sync: `sk8meet-media-kit.html`, `sk8meet-theme-sheet.html`, UI asset library.
- Anything not covered here: default to the five brand principles in section 1, then document the decision here.
