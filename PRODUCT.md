# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

(Expo / React Native app that also builds for iOS with the same design language; Android with TalkBack is the primary validation and demo target.)

## Users

Young adults in Colombia (university students and early-career professionals, 18–30) who earn and spend in COP, usually from a phone, in short moments between classes, commutes or after a purchase. Their job: know where their money went this month, stay inside a few spending limits, and save toward something concrete. Secondary: users with low vision or who use a screen reader (TalkBack/VoiceOver) or large system text, who are badly served by chart-only finance apps. *(Personas reconstructed by the team for Phase 3; the Phase 1 team submission is not in the repository.)*

## Product Purpose

FINZA turns a month of income and expenses into a clear, honest picture (income, spending, net flow, comparison with last month, spending by category), lets the user set monthly category budgets and savings goals, and accompanies them with Monedin, a friendly mascot that explains, celebrates and reminds without nagging. Success: a user records a movement in seconds, understands their month at a glance, and can do all of it with a screen reader.

## Positioning

Accessible, private, exact personal finance with a companion. Unlike AI-in-the-cloud trackers (MonAi), FINZA: interprets quick Spanish entries on the device without sending financial data to third parties; stores money as exact decimals with server-verified ownership and rotating sessions; and treats screen-reader and large-text use as a first-class requirement, not an afterthought.

## Operating Context

Phone in hand, one thumb, often outdoors or on a bus; frequent, very short sessions (record one expense), plus a weekly/monthly review session. Spanish UI, COP currency, America/Bogota calendar. Course context: Universidad de La Sabana mobile development final delivery, live demo on an Android emulator and an individual code defense.

## Capabilities and Constraints

- Existing and kept: registration/login with Argon2id and rotating refresh tokens (SecureStore), income/expense movements in COP with idempotent creation, editing and archiving, system and private categories, monthly dashboard (income, expense, net flow, comparison with previous calendar month, last five movements).
- Planned for this delivery: category spending breakdown, monthly category budgets, savings goals with contributions, quick natural-language entry parsed on device, tab navigation, Monedin integration, full visual redesign.
- Constraints: FastAPI + PostgreSQL backend, Expo SDK 58 + Redux Toolkit/RTK Query, TypeScript strict. Money is never a float. "Flujo neto del mes" is never called balance or net worth. No bank connections, no investment advice, no generative AI.

## Brand Commitments

- Name: **FINZA**. Mascot: **Monedin**, a small 3D monkey: soft desaturated sage-green body, cream face, pink cheeks, dark-green eyes, small limbs, curled tail, two little sprouts on top. Reference: `assets/brand/monedin-reference.jpg`. Its proportions and colors must not be altered or reinvented.
- Monedin appears with intent (onboarding, empty states, confirmations, goals, tips), never on every screen. The app must still read as serious and trustworthy.
- Voice: Spanish, warm, plain, never infantilizing; tú form.
- Requested feel: extremely minimal, elegant, modern, premium, generous whitespace, careful typography, consistent iconography, subtle functional motion.

## Evidence on Hand

- Real backend and test suites (112 PostgreSQL tests, 51 mobile tests).
- MonAi research: `docs/engineering/reverse-engineering-monai.md`.
- No real user testimonials, usage metrics or user research results exist; do not fabricate them.

## Product Principles

1. Clarity over cleverness: every number says what it is, in words, in COP.
2. Accessibility is part of done, never a later pass.
3. Exactness and privacy are features the user can feel and the team can prove.
4. Monedin helps; it never decorates, nags or blocks.
5. Fewer, finished features over many apparent ones.

## Accessibility & Inclusion

WCAG 2.2 AA adapted to mobile: TalkBack/VoiceOver semantics (labels, roles, hints, states, grouping), 4.5:1 text contrast, 3:1 for graphics, 48 dp targets, font scaling to 200% without clipping, no information by color alone, Reduce Motion respected, haptic/visual/announced feedback for success and errors.
