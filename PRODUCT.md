# Product

## Register

product

## Users

Five roles of a single coffee-shop chain, mostly in Vietnamese:

- **Customer** - orders by QR/app on a phone, tracks the order, earns loyalty points, chats with the AI "Smart Barista".
- **Cashier** - takes orders at the POS under rush-hour pressure, manages tables and end-of-shift handover.
- **Warehouse staff** - receipts, stocktaking, suppliers, expiry/FEFO alerts.
- **Manager** - dashboard, menu, staff, payroll, reports, AI suggestions and demand forecasts.
- **System admin** - users, branches, AI knowledge base, audit logs.

## Product Purpose

AICOS (AI-Integrated Smart Coffee Shop Platform) is the web front end for managing and optimising a multi-branch coffee
chain, with AI woven into daily work (chatbot, forecasting, business summaries). Success means a cashier can ring up an
order in seconds, a manager trusts the numbers, and AI suggestions are understandable and optional.

## Brand Personality

Warm, calm, dependable. Like a good neighbourhood roastery that happens to run on excellent software - never flashy tech.

## Anti-references

- Generic SaaS: purple-blue gradients, glassmorphism, neon "AI" glow
- Cards inside cards, heavy shadows, bounce easing
- Gray text on coloured backgrounds; pure black text
- Status shown by colour only

## Design Principles

1. **Speed at the counter** - POS and kitchen screens favour large targets and few steps over decoration.
2. **One source of truth** - `DESIGN.md` holds the tokens (mirrored in `src/index.css` `@theme`); do not hardcode new colours or fonts.
3. **AI is a helper, not a show** - label AI output, explain it in one plain sentence, let the user dismiss it.
4. **Same product, five roles** - shared layout, tokens and patterns across every role.
5. **Accessible by default** - WCAG 2.1 AA contrast, visible focus, `prefers-reduced-motion` honoured.

## Accessibility & Inclusion

WCAG 2.1 AA minimum (4.5:1 for body text). Vietnamese diacritics render correctly. Touch targets at least 44px on customer and POS screens.
