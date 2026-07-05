# Archive Slideshow for After Effects

Archive Slideshow is a dockable ScriptUI panel for Adobe After Effects. It
turns a folder tree of mixed-size, mixed-aspect photographs into a coherent,
fully editable slideshow without forcing every image into the same frame.

## Install

1. Quit After Effects.
2. Copy `ArchiveSlideshow.jsx` into the After Effects
   `Scripts/ScriptUI Panels` folder.
3. Restart After Effects.
4. Open **Window > Archive Slideshow**.

Typical macOS location:

```text
/Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels/
```

Typical Windows location:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\
```

## Workflow

The panel is three tabs — **Setup**, **Style**, **Pairs** — with the Build
button, the refine buttons, and the status line always visible below.

1. **Setup**: choose the photo folder; set canvas size, frame rate, slide
   and transition durations; toggle the designed background and per-folder
   title cards.
2. **Style**: pick the allowed framings, movements, and transitions from
   rows of icon tiles — each tile is a small diagram of the layout it
   builds, named in its tooltip — and choose a color treatment (Original,
   Monochrome, or Faded).
3. **Pairs**: set how often two photos share a slide, the pair length, and
   the allowed pair styles (icon tiles again).
4. Click **Build Editable Slideshow**.

Style tiles share one model: **selected tiles form the allowed pool**.
Select one to force it on every slide; select several to let the automatic
mix choose among them; select everything for the full mix. Movement is the
one exception: deselecting every movement tile means still slides. A
narrow brief — say, cuts only, gentle push only — is just a matter of
deselecting everything else.

Photos are never enlarged past about 110% of their original size by the
automatic treatments; slides that exceed it (forced framings, small photos
in two-up windows) are labeled `CHECK ENLARGEMENT` for review.

The panel scans subfolders recursively. Folder and file names are sorted
naturally, so names such as `01 Intro`, `02 Family`, and `photo-10.jpg` retain
their intended sequence. Each folder can also generate a section card.

## Adaptive Image Treatments

With more than one treatment checked, the mix evaluates effective resolution
and aspect-ratio mismatch, then varies the treatment across the sequence —
constrained to the checked pool. Eligible landscape and square images
become full-bleed slides most of the time — the strongest single-image layout.
Images that cannot fill the frame cleanly (portraits, low-resolution, or
strong aspect mismatches) rotate evenly among the soft-background,
window-frame, and print treatments, with Near Full used only occasionally and
Contained joining the automatic rotation only when none of the softer
protective treatments are checked (checking it alone forces it, as with any
single checked style).

Orientation is part of that decision. Landscape images are preferred for
full-bleed slides. Portrait images are preferred for two-up layouts; single
portraits stay in protected treatments instead of being automatically forced
into a wide crop.

The six treatments:

- **Full Bleed** fills the canvas, including when that requires enlargement.
- **Near Full** fits the image inside a narrow transparent perimeter.
- **Soft Background** protects the original image while a heavily blurred
  duplicate fills the frame, tinted by a deep blue color wash so the
  background reads as a deliberate color field that sets off the photo.
- **Window Frame** places a moving, overscanned image inside a fixed light
  frame. The opening clips the image as it pans or pushes.
- **Print** keeps the full image and matte together as a subtly rotated
  photographic object.
- **Contained** uses a restrained dark background and caps enlargement.

Standard image layouts have transparent composition backgrounds, including
Near Full, Window Frame, Print, Contained, and the two-up styles. This lets a
background added to the master composition show through every inset slide.
Treatments that intentionally create a background, such as Soft Background,
retain their generated background layers.

The **Add background behind everything** option (on by default) places a
refined dark charcoal field with a soft vignette under every slide in the
master composition, so the transparent inset layouts sit on a designed ground
rather than pure black. The generated `MASTER BACKGROUND` and `MASTER
VIGNETTE` layers can be recolored, replaced with your own artwork, or deleted.

A built-in enlargement ceiling (about 110% of original size) controls how far
foreground archive images may be enlarged in automatic and protected
treatments. Explicit Full Bleed and Near Full choices prioritize the selected
composition over that automatic limit.

Pairing can be set to Never (all singles), Occasionally, When low-res, Often,
or Always (all pairs). "Never" forces every slide to a single photo, and
"Always" pairs every photo two-by-two — using the chosen Pair style — leaving
only a final odd photo in a section as a single. Between those extremes, the
sequence keeps pairs tasteful (no two in a row, none at a section opening).
Pair styles include Hero + Support, Offset Pair, clipped window
frames, loose prints, clean contained images, and edge-to-edge split screens
divided by a thin center rule.
Both photographs receive one shared movement per slide; paired pans use
complementary directions rather than mixing a static image with a moving one.
With several pair styles checked, the rotation favors Hero + Support, Offset
Pair, and Edge to Edge, using window-frame, print, and clean pairs only
occasionally; unchecked styles drop out of the rotation.

Two low-resolution images pair regardless of orientation, since sharing a
slide means each needs less enlargement. A low-resolution image may also look
a few positions ahead in its section for a low-resolution partner instead of
settling for whichever image happens to sit next to it, so sequence order can
shift slightly where pairs form.

The sequence prevents consecutive two-ups and keeps them away from section
openings and closings. Auto Mix promotes an eligible landscape image to a hero
at each section opening and after a long run without one. The last slide in a
section receives a slightly longer hold.

The **Color treatment** menu can leave images unchanged or apply Monochrome
or Faded color across the generated slideshow.

Generated photo layers include expression-backed Effect Controls for
**Reframe X**, **Reframe Y**, **Zoom**, and **Motion Amount**. These controls
adjust crop and movement after generation while preserving the underlying
recipe keyframes.

Checking **Full Bleed** alone still overrides the orientation rules. A
portrait image forced into that treatment receives a `CHECK PORTRAIT CROP`
name, warning comment, and colored label on both its slide and the master
timeline so the crop is easy to review.

Auto Mix never promotes a low-resolution image to a hero slide; weak images
stay in protected treatments. When any photo ends up displayed beyond about
133% of its original size — for example, a low-resolution image explicitly
forced to Full Bleed, or a very small image filling a two-up window — its
slide receives a `CHECK ENLARGEMENT` name, a comment recording the applied
scale, and a colored label on both the slide and the master timeline. The
slideshow still builds; the labels exist so deliberate exceptions are easy to
find and review.

## Output

The script creates:

- One master slideshow composition
- One composition per slide
- Small editable photo-window precomps where a treatment needs clipped motion
- Clearly named, ordinary photo, matte, background, and text layers
- A project folder containing imported images and generated slide comps

The result has no runtime dependency on the panel. Timing, framing, text,
keyframes, transitions, and image choices can all be adjusted manually after
generation.

## How to tell what a slide used

Each slide comp records the move it was built with in two places:

- The comp **name** ends with a short tag such as `[Soft BG / Push]` or
  `[Edge / Push+Drift]`, so the treatment and movement are visible at a glance
  in the timeline and Project panel.
- The comp **comment** holds the full detail — `treatment`, `motion`, `kind`
  (single or pair), and the `src` path of each source photo — under the
  `Archive Slideshow Slide` tag. This is also the save-state the Cycle button
  reads to rebuild a slide with a different layout.

## Cycling a slide's layout

To re-roll a single slide without rebuilding the whole slideshow, target it in
any of three ways, then click **Cycle**:

- open the slide comp, or
- click the slide's layer in the master timeline, or
- select the slide comp in the Project panel.

Each click rebuilds that slide in place with the next layout in the list —
single-photo slides step through the checked image treatments, two-up slides
step through the checked pair styles — so you can cycle until it looks right.
Narrowing the checkboxes narrows the cycle, which makes re-rolling faster
when you already know the styles you want. Cycling from
the master timeline keeps the master in view and renames its layer to match, so
you can keep working in context.

Cycling keeps the slide's size, duration, and the movement it was built with,
and reads the current panel's color treatment. It rebuilds
the slide from its recorded source photos, so any manual tweaks to that slide
are replaced. Old photo-window precomps from the previous layout are removed
as part of the re-roll.

## Merging and splitting slides

Two more post-operations reshape pairing after generation, using the same
slide targeting as Cycle:

- **Merge »** combines the selected single-photo slide with the next
  single into one pair slide, choosing a layout from the selected pair
  styles. It refuses to cross a section card.
- **« Split »** breaks the selected pair into two single slides, one per
  photo, joined by the panel's first selected transition. Both halves keep
  the movement the pair was built with.

The **Pair length** dropdown sets the timing at click time. With
**Standard** (the default), a merged pair occupies one slot and later slides
move up; a split gives each photo a full slot and later slides move back.
With **Doubled**, a merge spans both original slots and a split halves the
slot, so nothing else moves. Either way the transition at the affected seam
is rebuilt and the master composition's duration and background layers are
adjusted to match; transitions elsewhere travel with their slides
untouched.

## MVP Notes

- Supported source extensions include JPEG, PNG, TIFF, PSD, BMP, GIF, HEIC,
  WebP, and EXR when the installed After Effects version can decode them.
- Two-up layouts do not cross folder/section boundaries.
- Checked transition styles cycle in menu order. Check only one style to use
  it throughout.
- Regeneration currently creates a new slideshow rather than preserving edits
  made to an earlier build.
