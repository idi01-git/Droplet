---
name: Droplet
description: Playful neo-brutalist temporary sharing web app for instant, zero-login handoffs
colors:
  primary: "#FFE000"
  primary-hover: "#E6CA00"
  ink: "#000000"
  canvas: "#FFFDE7"
  surface: "#F5F3EA"
  card: "#FFFFFF"
  error: "#FF6B6B"
  success: "#00D084"
  info: "#3B82F6"
  accent-owner: "#A855F7"
  muted: "#52525B"
typography:
  display:
    fontFamily: "Fredoka, cursive, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Fredoka, cursive, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Fredoka, cursive, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Fredoka, cursive, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-surface:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-owner:
    backgroundColor: "{colors.accent-owner}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-status:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Droplet

## Overview

**Creative North Star: "The Tactile Air-Drop"**

Droplet rejects the generic, polished corporate cloud aesthetic in favor of a playful, physical, and unpretentious neo-brutalist identity. The design treats every element like a physical cardboard badge or tactile arcade button: thick black outlines, bold drop shadows, and high-energy canary yellow accents. It signals to users that the application is immediate, disposable, and fun—not an austere permanent filing cabinet.

The visual density is balanced between high-speed task execution and delightful brand cues. The animated Droplet mascot acts as an emotional anchor, turning empty dropzones and countdown timers into engaging physical states. 

**Key Characteristics:**
- **Inky Boldness:** Solid `#000000` strokes define all container boundaries; hairline dividers are strictly forbidden.
- **Tactile Physics:** 4px hard offset shadows depress `2px 2px` upon user click, providing unmistakable physical feedback.
- **Expressive Duopoly:** Chunky `Fredoka` display typography conveys friendliness, while clean `Inter` guarantees sharp legibility for terminal commands and code snippets.
- **Zero Cosmetic Fuzz:** No gradients, no frosted glass blurs, and no decorative glow effects. Pure high-contrast color blocks.

## Colors

The palette uses a high-contrast warm foundation with canary yellow as the primary voice, anchored by pitch black ink.

### Primary
- **Canary Yellow** (`#FFE000`): The signature brand color used for primary call-to-actions, hero badges, mascot fills, and live active indicators.
- **Canary Deep** (`#E6CA00`): The active pressed and hover companion to Canary Yellow.

### Neutral
- **Pitch Ink** (`#000000`): High-contrast text, 2px and 3px container borders, and crisp hard offset shadows.
- **Warm Canvas** (`#FFFDE7`): Creamy background canvas that prevents harsh glare while preserving neo-brutalist punch.
- **Warm Surface** (`#F5F3EA`): Secondary backing for inner modules and code blocks.
- **Card Crisp** (`#FFFFFF`): High-clarity background for active inputs, note bubbles, and file cards.
- **Slate Muted** (`#52525B`): Subtitle text, secondary metadata, and helper hints.

### Functional Roles
- **Coral Red** (`#FF6B6B`): Destructive actions ("Delete Room", remove item) and error banners.
- **Mint Green** (`#00D084`): Live WebSocket sync indicator and copy-to-clipboard confirmations.
- **Electric Blue** (`#3B82F6`): Shared hyperlinks and dropzone drag-over target states.
- **Royal Violet** (`#A855F7`): Room owner role badge.

### Named Rules
**The Inky Contrast Rule.** Every interactive card and container must have a minimum `2px solid #000000` border. Contrast is non-negotiable.
**The Rarity of Yellow Rule.** Canary yellow is reserved for primary CTAs and active state highlights; it covers ≤15% of the viewport to maintain punch.

## Typography

**Display Font:** `Fredoka` (Google Fonts, with fallback `cursive, sans-serif`)
**Body Font:** `Inter` (Google Fonts, with fallback `-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`)
**Code/Mono Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Character:** Friendly, rounded geometric display headings paired with utilitarian, hyper-scannable body sans-serif.

### Hierarchy
- **Display** (Bold 700, `clamp(1.75rem, 4vw, 2.75rem)`, line-height 1.2): Hero titles, home headlines, and 4-digit room code banners.
- **Headline** (Bold 700, `1.5rem` / `24px`, line-height 1.25): Card headings, section titles ("Drop Note or Link", "Room Files").
- **Title** (SemiBold 600, `1.125rem` / `18px`, line-height 1.3): Feed sub-headers, modal titles, and file labels.
- **Body** (Regular 400, `0.9375rem` / `15px`, line-height 1.5): Running text, note entries, descriptions. Max measure 65–75ch.
- **Label / Tag** (Bold 700, `0.75rem` / `12px`, letter-spacing 0.02em): Badges, role tags, and countdown counters.

### Named Rules
**The Loud Heading Rule.** Every heading belongs in `Fredoka` at weight 700. Never set headings in lightweight body fonts.

## Layout

Droplet uses an adaptive, responsive spatial grid with fixed rhythm:
- **Maximum Width:** Bounded at `1100px` for optimal viewing on desktop monitors without excessive eye travel.
- **Outer Margins:** Symmetrical `20px` to `24px` gutter across all devices.
- **Main Room Architecture:** Two-column grid (`gridTemplateColumns: repeat(auto-fit, minmax(340px, 1fr))`) pairing the live note/link stream on the left with the file dropzone and list on the right.
- **Vertical Spacing Rhythm:** `20px` to `28px` between primary cards; `10px` to `12px` between feed items.

## Elevation & Depth

Droplet uses hard physical offset shadows rather than soft ambient blurs. Depth represents physical presence.

### Shadow Vocabulary
- **Standard Shadow** (`box-shadow: 4px 4px 0px #000000`): The baseline depth for cards, buttons, badges, and modals.
- **Small Shadow** (`box-shadow: 2px 2px 0px #000000`): Secondary inputs, badge pills, and active depressed buttons.
- **Large Shadow** (`box-shadow: 6px 6px 0px #000000`): Hover elevation on interactive cards.

### Named Rules
**The No-Blur Rule.** Blur radius is strictly `0px` everywhere. Shadows are opaque physical blocks, never fuzzy gradients.
**The Click Depression Rule.** On `:active`, clickable elements shift `translate(2px, 2px)` and reduce shadow to `2px 2px 0px #000000`, creating instant mechanical haptic satisfaction.

## Shapes

- **Corner Language:** Softened geometric neo-brutalism. Rounded enough to feel welcoming (`8px` small, `12px` cards/buttons, `16px` panels), with `9999px` full pills for status badges.
- **Borders:** `2px solid #000000` on cards and buttons; `3px solid #000000` on modals and primary hero panels.
- **Clipping:** Strict `overflow: hidden` on progress bars and card boundaries.

## Components

### Buttons (`.nb-button`)
- **Shape:** `12px` rounded corners with `2px solid #000000` borders.
- **Primary:** Background `#FFE000`, text `#000000`, font `Fredoka 700`.
- **Surface:** Background `#FFFFFF`, text `#000000`, tactile hover shadow.
- **Danger:** Background `#FF6B6B`, text `#FFFFFF`, for irreversible room deletion.
- **Interaction:** Hover translates `-1px -1px` with `5px 5px 0 #000`; active translates `2px 2px` with `2px 2px 0 #000`.

### Cards (`.nb-card`)
- **Shape:** `16px` border-radius with `3px solid #000000` border and `4px 4px 0 #000` shadow.
- **Surface:** Crisp `#FFFFFF` card background on creamy `#FFFDE7` canvas.

### Room Code Input (`RoomCodeInput`)
- **Shape:** 4 independent square boxes (`56px × 64px`) with `12px` radius and `3px solid #000000`.
- **State:** Active focus highlights with yellow background `#FFFDE7` and thick `3px` focus ring. Auto-advances on digit entry and backspaces cleanly.

### Badges (`Badge`)
- **Shape:** Full pill `9999px` with `2px solid #000000` border and `2px 2px 0 #000` shadow.
- **Variants:** `owner` (purple `#A855F7`), `file` (warm `#F5F3EA`), `success` (green `#00D084`), `error` (red `#FF6B6B`).

### Dropzone (`EmptyState`)
- **Shape:** Dashed `3px dashed #000000` with `16px` radius and animated floating Droplet mascot.
- **Drag-Over:** Shifting border to electric blue `#3B82F6`, background to `#EBF5FF`, and scaling by `1.01`.

## Do's and Don'ts

### Do:
- **Do** maintain bold `#000000` borders on all interactive cards, pills, and inputs.
- **Do** use `Fredoka` for all headings, titles, buttons, and badges.
- **Do** preserve the tactile `:active` depression (`translate(2px, 2px)`) on all clickable elements.
- **Do** keep error and countdown information visible at all times.

### Don't:
- **Don't** use CSS blur filters, drop-shadow blurs (`blur > 0`), or soft drop shadows.
- **Don't** use gradient backgrounds, metallic shines, or decorative glowing borders.
- **Don't** introduce low-contrast gray text on gray backgrounds; all body copy must be readable at a glance.
- **Don't** hide active countdown timers or room codes behind collapsible menus.
