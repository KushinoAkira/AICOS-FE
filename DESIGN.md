---
version: alpha
name: AICOS Warm Roast
description: Warm, calm and tactile - the feel of a well-run specialty coffee shop, with AI kept quiet in the background.
colors:
  primary: "#3A2E22"
  secondary: "#8A7A6C"
  tertiary: "#C97B4A"
  neutral: "#FAF6F0"
  surface: "#FFFFFF"
  surface-warm: "#F5EFE6"
  espresso: "#6F4E37"
  clay: "#8B5E3C"
  olive: "#7A8450"
  olive-bg: "#EAEDE0"
  border: "#E6DCCB"
  border-strong: "#D6C5B3"
  tertiary-bg: "#FDF0E6"
  success: "#5C7A52"
  warning: "#B98A3D"
  warning-bg: "#FDF3DC"
  danger: "#A6534B"
  danger-bg: "#FAE8E6"
  on-primary: "#FAF6F0"
  on-espresso: "#FAF6F0"
  on-surface: "#3A2E22"
typography:
  h1:
    fontFamily: Fraunces
    fontSize: 2rem
    fontWeight: "500"
    lineHeight: 1.2
    letterSpacing: -0.01em
  h2:
    fontFamily: Fraunces
    fontSize: 1.25rem
    fontWeight: "500"
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: "500"
    lineHeight: 1.2
    letterSpacing: 0.04em
rounded:
  xs: 4px
  sm: 8px
  field: 10px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.on-espresso}"
    rounded: "{rounded.full}"
    padding: 10px 20px
    typography: "{typography.body-md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.full}"
    padding: 10px 20px
    typography: "{typography.body-md}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.field}"
    padding: 10px 14px
    typography: "{typography.body-md}"
---

## Overview

AICOS serves five very different people (customer, cashier, warehouse staff, manager, admin) but must feel like one
product: warm, unhurried and trustworthy. Surfaces are creamy paper, text is dark roast, and the single energetic
accent is terracotta. The AI features (assistant, forecasts, suggestions) appear as helpful, plainly worded notes -
never as flashy "magic".

## Colors

- **Primary (#3A2E22):** dark roast, for headlines and body text. Never pure black.
- **Secondary (#8A7A6C):** muted mocha for captions, metadata and placeholders.
- **Tertiary (#C97B4A):** terracotta - highlights, active states, key figures.
- **Neutral (#FAF6F0):** cream page background. **Surface (#FFFFFF)** cards sit on it.
- **Espresso (#6F4E37):** primary action colour and the sidebar. **Clay / Olive** are supporting tones for categories.
- **State colours:** success / warning / danger are earthy on purpose; always pair them with text or an icon, never colour alone.

## Typography

- **Headlines:** Fraunces (serif, medium) - gives the warm, café-menu voice.
- **Body and data:** Inter at 14px for dense dashboards (POS, stock tables), 16px for customer-facing reading.
- **Labels:** Inter 12px medium with slight tracking.
- Vietnamese diacritics must render cleanly: always load both fonts with the Vietnamese subset.

## Layout

Dashboard roles (cashier, warehouse, manager, admin) share a left sidebar (espresso) + cream content area.
The customer app is single-column and touch-first. Base unit 8px; cards use 24px inner padding.

## Elevation & Depth

Depth comes from cream-on-white stacking and 1px `border` lines. Shadows are soft and rare (floating bars, modals only).

## Shapes

Rounded and friendly: 16-20px cards and modals, 10px form fields, 4px for tiny chips, fully rounded (pill) buttons and tags.

## Components

- **button-primary:** espresso pill with cream text; one per view.
- **button-secondary:** white pill, espresso text, 1px border.
- **card:** white, 16px radius, 1px border, no nested cards.
- **input:** white, 10px radius, border becomes terracotta on focus.

## Do's and Don'ts

**Do:** keep copy short and in Vietnamese; show AI output as a labelled suggestion the user can accept or ignore;
respect `prefers-reduced-motion`.

**Don't:** use pure black or purple/blue gradients; stack cards inside cards; use bounce easing; convey status by colour alone.
