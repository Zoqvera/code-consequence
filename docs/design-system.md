# Code & Consequence — Visual Design System

## Direction

The visual language is an **editorial observatory**: rigorous, investigative and data-aware rather than a generic futuristic AI product. The interface should feel closer to an independent journal, policy lab or research observatory than to a SaaS dashboard.

The system combines warm paper surfaces, dense dark green sections, an acid-green signal color, restrained rules and a serif/sans typographic contrast.

## Brand mark

The square coordinate mark represents observation, mapping and consequence. Use it with the CODE & CONSEQUENCE wordmark in navigation and as the browser/app icon. Do not distort, rotate permanently or recolor it outside the approved palette.

## Color tokens

- `--ink #151815`: primary text, borders and primary actions.
- `--paper #f3f0e7`: primary page background.
- `--paper-raised #faf8f1`: elevated menus and surfaces.
- `--muted #686e67`: secondary text and metadata.
- `--line #c9c6bb`: default dividers and structural rules.
- `--acid #b9ff45`: signal/accent color for verification, focus and emphasis.
- `--deep #202820`: dark editorial sections.

Use acid green sparingly. It is a signal color, not a general background color.

## Typography

- Sans: **Inter** via `next/font` for navigation, labels, metadata, controls and utility text.
- Serif: **Source Serif 4** via `next/font` for headlines, leads and long-form editorial emphasis.

Headlines should use tight tracking and compact line-height. Utility text should use uppercase, smaller sizes and increased letter spacing.

## Layout and spacing

- Maximum content shell: `1180px`.
- Desktop gutters: `24px+`.
- Mobile gutters: `16px`.
- Large sections should normally use 72–96px vertical spacing.
- Structural borders are part of the identity and should replace decorative cards whenever possible.

## Responsive behavior

- Desktop: full navigation and multi-column editorial grids.
- Tablet (`<= 980px`): compact two-column layouts where appropriate and mobile navigation trigger.
- Mobile (`<= 760px`): single-column content, 16px gutters, full-width primary actions where useful and minimum 42–44px interactive targets.
- Small mobile (`<= 430px`): tighter brand lockup and simplified utility controls.

New components must be verified at approximately 390px, 768px, 1024px and 1440px widths.

## Buttons and interactive states

Every interactive element must have visible default, hover, focus-visible and active states.

Primary actions use dark ink with the acid offset shadow. Hover lifts the action slightly; active presses it back toward the surface. Links use restrained underline or directional-arrow motion rather than large color changes.

Touch-only devices must not depend on hover to communicate meaning.

## Motion

Motion is functional and short: typically 150–250ms with `--ease-out`. Appropriate uses include menu opening, underline reveals, button lift/press, card emphasis and small directional arrows.

Never animate large editorial blocks continuously. Respect `prefers-reduced-motion` globally.

## Imagery

Prefer documentary and evidence-led imagery: public infrastructure, institutions, landscapes affected by compute infrastructure, policy events, real organizations, maps, diagrams and original data visualizations.

Avoid generic AI imagery such as glowing brains, humanoid robots, neon circuits, anonymous server-room stock photos and synthetic sci-fi faces unless the image itself is the subject of the reporting.

Images should reinforce a specific article, initiative or piece of evidence. When no meaningful image exists, retain the typography-and-data-led layout rather than adding decorative stock imagery.

## Icons

Icons should be geometric, minimal and mostly one-color. Prefer 1–1.5px strokes, square/coordinate motifs and simple directional arrows. Avoid mixed icon families or colorful illustrative icon sets.

## Consistency rule

Before adding one-off CSS to a page, check whether the requirement belongs in `app/globals.css` as a reusable token, layout rule or interaction state. Page modules should handle genuinely page-specific composition only.
