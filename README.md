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

1. Choose a folder containing archive images.
2. Set the canvas size and seconds per image.
3. Choose an image treatment, pairing policy, movement, color treatment,
   and transitions.
4. Click **Build Editable Slideshow**.

The panel scans subfolders recursively. Folder and file names are sorted
naturally, so names such as `01 Intro`, `02 Family`, and `photo-10.jpg` retain
their intended sequence. Each folder can also generate a section card.

## Adaptive Image Treatments

**Auto Mix** evaluates effective resolution and aspect-ratio mismatch, then
varies the treatment across the sequence. Eligible images become full-bleed
hero slides. Other images rotate among the stronger protected treatments —
soft-background, window-frame, and print. Near Full is used only sparingly,
and Contained is left out of the automatic rotation entirely (it remains
available as a manual choice).

Orientation is part of that decision. Landscape images are preferred for
full-bleed hero slides. Portrait images are preferred for two-up layouts;
single portraits stay in protected treatments instead of being automatically
forced into a wide crop.

Other treatments can be forced across the slideshow:

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

The **Max enlargement** setting controls how far foreground archive images may be
enlarged in automatic and protected treatments. Explicit Full Bleed and Near
Full choices prioritize the selected composition over that automatic limit.

Pairing can be set to Never, Occasionally, When low-res, or As often as
possible. Pair styles include Hero + Support, Offset Pair, clipped window
frames, loose prints, clean contained images, and edge-to-edge split screens
divided by a thin center rule.
Both photographs receive one shared movement per slide; paired pans use
complementary directions rather than mixing a static image with a moving one.

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

Explicitly choosing **Full Bleed** still overrides the orientation rules. A
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

## MVP Notes

- Supported source extensions include JPEG, PNG, TIFF, PSD, BMP, GIF, HEIC,
  WebP, and EXR when the installed After Effects version can decode them.
- Two-up layouts do not cross folder/section boundaries.
- Checked transition styles cycle in menu order. Check only one style to use
  it throughout.
- Regeneration currently creates a new slideshow rather than preserving edits
  made to an earlier build.
