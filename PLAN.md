# Archive Slideshow — Evolution Plan

Roadmap for growing the panel beyond the current MVP, in recommended order.
Guiding idea: the Cycle button proved that **post-generation control** is where
the real power is, so the plan favors post-ops and tighter style control over
new build-time complexity.

## Architecture note: single/pair → N photos

The data side already generalizes: slide specs carry an `images: [...]` array,
comp comments store one `src:` line per photo, and `recoverImages()` rebuilds
from any count. The binary assumption lives only in:

- `kind: "single" | "pair"` and the hard branches on it
  (`createTwoUpSlide` vs `createSingleSlide`, `PAIR_CYCLE` vs `SINGLE_CYCLE`)
- `findPairPartner()` looks for exactly one partner
- Pair layouts are geometrically two-slot designs

Generalization: treat **photo count** (`sources.length`) as the real key.
Layout dispatch becomes a lookup — count 1 → single treatments, count 2 →
pair styles, count 3 → triptych styles — and each count gets its own cycle
list. Do this refactor before adding 3-up layouts (folds naturally into
Step 2).

## Step 1 — Checkbox style pools ✅ (v0.4.0)

Extend the Transitions panel's model (checked styles form the pool; one
checked = used throughout) to the other style choices:

- **Image treatment** → checkboxes for Full Bleed, Near Full, Soft
  Background, Window Frame, Print, Contained. All checked = today's Auto
  Mix; one = today's forced mode; a subset = Auto Mix constrained to the
  pool. Eligibility rules (portrait protection, low-res demotion) keep
  operating *within* the pool.
- **Movement** → same pattern (Still, Gentle Push, Gentle Drift,
  Push + Drift).
- **Pair style** → same pattern.

The "narrow view" workflow becomes: check only Cut, only Gentle Push, set
photos-per-slide to 1. **Cycle also respects the pool**, stepping only
through checked styles.

Internals: config fields become arrays; `chooseTreatment` /
`resolveTwoUpStyle` filter their rotations by the pool. Low risk, no
timeline surgery.

## Step 2 — Merge / Split post-ops ✅ (v0.5.0; kind→count refactor deferred to Step 3)

Two new buttons beside Cycle, reusing its machinery (`activeSlideComp`,
`parseSlideComment`, `reRollSlide`):

- **Merge with Next** — select a slide layer in the master; combine its
  source list with the next slide's, rebuild the first comp as a pair,
  delete the second layer + comp, repair the seam transition. Refuses
  across a section card.
- **Split** — select a pair; rebuild it as a single of photo 1, create a
  new comp for photo 2, insert its layer after.

**Timing honors the Pair length dropdown at click time (Standard is the
default and the preferred workflow):**

- *Standard:* merged pair occupies one slot → downstream slides ripple
  earlier, master shortens. Split gives each single a full slot →
  downstream ripples later, master lengthens.
- *Doubled:* merge spans both original slots, split halves them — no
  ripple.

Ripple mechanics (verified against `makeSchedule` / `assembleMaster`):
transitions are keyframes on the slide layers themselves and travel with
`startTime` shifts, so a ripple is (1) shift downstream layers by the
delta, (2) rebuild only the seam transition, (3) adjust master duration.
Build this as a reusable "retime master from its layers" helper — future
post-ops (delete slide, reorder, duration tweaks) will want it.

Includes the `kind` → count refactor from the architecture note.

## Step 3 — Max photos per slide (N-up layouts) — DEFERRED (2026-07-04)

Deferred by choice: for standard screens the 1/2-photo functionality is
where it should be, and N-up risks overcomplicating the codebase for a
rarely used feature. If it returns, it likely returns as a separate,
special-purpose variant of the plugin for unusual canvases (e.g. ultrawide
7000×1080 screens) and/or more photos per slide, forked from a stable core.

A number field (1–4) replacing the implicit ceiling of 2:

- Frequency dropdown (Never → Always) still governs *how often* multi-photo
  slides form; the number caps *how many* photos one may hold.
- `findPairPartner` generalizes to a group builder: seed photo, gather up
  to N−1 eligible partners under the same taste rules (portraits group
  well, low-res photos seek each other, landscapes resist). Larger groups
  rarer than pairs.
- Sequence rules extend: no consecutive multis, none at section
  openings/closings.
- Duration generalizes Pair length into per-photo time:
  `seconds × (1 + (n−1) × factor)`.
- New layouts, the bulk of the work. Count 3: **Triptych** (edge-to-edge
  thirds with the existing hairline rule), **Hero + Two**, **Print
  Scatter**. Count 4: grid, hero + three.

## Step 4 — Panel UI redesign (mockup-first)

Iterate the panel layout as an interactive HTML mockup (generated as a
Claude Artifact, viewed in the browser), then translate the agreed layout
to ScriptUI. The mock decides layout, grouping, and workflow — not pixel
styling, since ScriptUI is a native widget toolkit with no HTML/CSS.
Sensible to do alongside Step 1, when the panel layout changes most.

## Someday / not now

- **CEP/UXP extension** — a real HTML/CSS panel inside AE for a fully
  custom, designed interface. The slideshow logic would port, but it's a
  UI rewrite plus an installer/signing story. Revisit after MVP.
- Cross-build footage reuse bug noted during Cycle development (latent,
  deferred).
