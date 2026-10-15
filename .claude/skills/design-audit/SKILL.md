---
name: design-audit
description: "Use this skill whenever the user wants Claude to review, audit, or critique the visual design or UX of an EXISTING page/app (via code, screenshots, or a live URL), extract its design system (colors, type, spacing, components) so new elements can be added consistently, or find usability/accessibility problems and propose fixes. Trigger on phrases like 'revisa el diseno de mi pagina', 'detecta problemas de UX', 'que combine con el estilo actual', 'agrega esto siguiendo el mismo diseno', 'audit this site design/UX', 'extract the design system', 'does this look consistent', 'critique my UI', even if the user doesn't use the words 'audit' or 'design system' explicitly. This is the skill for working with a design that ALREADY EXISTS; for building a NEW design from scratch use frontend-design instead. The two are often used back to back, auditing first and then building additions with frontend-design's craft principles while staying inside the extracted tokens."
---

# Design Audit

Two things this skill does, usually together:

1. **Extract the design system** already in use on a page (tokens: color, type, spacing, components, motion) so anything added afterward blends in instead of looking bolted-on.
2. **Find UX/accessibility problems** and explain them in terms of impact on a real user, not just taste.

This skill assumes a design already exists and is being read, not invented. If there's no existing design to react to (a blank-page brief), that's `frontend-design`'s job, not this one. If the user wants both — audit, then add something new — do this skill's Step 1 and 2 first, then hand off to `frontend-design`'s craft principles for anything new you build, constrained by the tokens you just extracted.

## Step 0: Gather inputs

Get as many of these as are available before drawing conclusions — partial input gives partial confidence, and it's worth saying so rather than guessing:

- **Code** (HTML/CSS/JSX/etc.) — the ground truth for exact values (hex codes, px/rem, font-family strings). Read actual stylesheets/config (e.g. `tailwind.config`, `:root` CSS variables, a theme file) rather than inferring from component markup alone.
- **Screenshots or a live URL** — ground truth for what a user actually sees: rendered spacing, real contrast, responsive behavior, states that only appear at runtime (hover, focus, error, empty, loading). If given a URL and a browsing tool is available, capture more than one viewport width and at least one interactive state, not just the cold-load hero.
- If only one input type is available, say what you can and can't verify from it. Screenshots alone can't give exact hex/px values — name them approximately and flag them as approximate. Code alone can't confirm rendered contrast or real responsive breakage — flag that too.

Don't ask the user to gather more than they've already offered; work with what's there and note gaps inline rather than blocking on them.

## Step 1: Extract the design system

Produce a compact token inventory, the same shape a designer would hand to another designer:

- **Color** — every distinct color in use, named by role (e.g. "primary action / #2563EB", "muted text / #6B7280"), not just a swatch dump. Flag near-duplicates that are probably meant to be the same value (e.g. #2563EB and #2563EA both used for links) — these are usually drift, not intent.
- **Type** — typeface(s) actually loaded, and the real scale in use (sizes/weights/line-heights as they appear, not a guessed canonical scale). Note if body text and headings use different families deliberately or by accident.
- **Spacing & layout** — the base unit if one is discernible (4px/8px grid, etc.), container widths, gutter/margin patterns, breakpoints.
- **Components** — recurring patterns already built: button variants, card shape (radius, shadow, border), form field style, nav pattern. Describe each once; don't re-describe every instance.
- **Motion** — any transitions/animations already present (duration, easing, what triggers them), so additions match pace rather than feeling slower or snappier than the rest.
- **Signature/voice** — in a sentence or two, what makes this design recognizable as itself (a distinctive accent, a copy tone, an illustration style). This is what "consistent" additions need to preserve — matching hex codes alone can still look off-brand if this is ignored.

Present this as a short reference (a markdown table or labeled list is enough — this doesn't need to be a polished deliverable unless the user asks for one). Keep it scannable; the goal is a lookup table, not prose.

If asked to add or build something new after this step, treat the extracted tokens as constraints: reuse existing component patterns before inventing new ones, stay inside the established palette and type scale, match spacing rhythm, and match the motion pace already present. Read `/mnt/skills/public/frontend-design/SKILL.md` for the craft process (planning, self-critique, avoiding generic AI-design defaults) and apply it inside these constraints rather than starting from a blank slate — the brief here is "extend this system," not "invent a new one."

## Step 2: UX and accessibility audit

Work through `references/ux-checklist.md` for the full heuristic set (visual hierarchy, consistency, accessibility, responsive behavior, states/feedback, content/copy). Don't just list category names — check the actual page against each one and only report what's actually present or actually missing.

For every issue found, give:

- **What** — the concrete, specific problem (not "improve contrast" but "body text on the hero, #9CA3AF on white, is ~2.5:1 — below the 4.5:1 minimum for normal text").
- **Where** — which element/screen/breakpoint.
- **Why it matters** — the real consequence for a user (can't read it in sunlight, can't tell the button is disabled, loses place on mobile), not just "best practice says so."
- **Fix** — a specific, actionable change (an exact color, a spacing value, a copy rewrite), sized to fit the existing token system from Step 1 rather than introducing new ad hoc values.

Group by severity, not by category: blocking (can't complete a task, fails basic accessibility) → significant (confusing, inconsistent, likely to cause errors) → polish (would tighten it up but nothing is broken). Lead with blocking issues. Don't pad the list — a clean page with few real issues should get a short report, not filler ones invented to look thorough.

## Output format

Default to a conversational answer in the chat: the token inventory and the issue list, both scannable, no unnecessary headers-for-headers'-sake. Only produce a saved file (e.g. a markdown design-system doc) if the user asks for something to keep/share — most of the time this is a working reference for the current conversation, not a deliverable.

When the audit leads directly into building something, move straight into that work using the extracted tokens — don't make the user re-paste the design system back at you.
