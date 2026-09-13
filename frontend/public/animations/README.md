# Animation assets

These MP4s are cropped/scaled/re-encoded from the screen-recording GIFs in
`/exportanimations` at the repo root (kept there as source, untouched).

| File | Source GIF | Used in |
|---|---|---|
| `hero-flow.mp4` | `mainanimation.gif` | `Hero.tsx` — replaces the old procedural terrain |
| `oracle-checks.mp4` | `fulloracleanimation.gif` | `OracleSection.tsx` |
| `topic-created.mp4` | `linkconvertanimation.gif` | `LedgerSection.tsx` |
| `creator-balance.mp4` | `creatorbalanceanimation.gif` | `Analytics.tsx` |
| `earned-today.mp4` | `earned today animation.gif` | `Analytics.tsx` |

Originals were 3834px-wide, 7–20MB screen recordings at a declared 100fps
(really just GIF frame-delay quantization). Converted to cropped H.264 MP4s
at 20–24fps, 132KB–643KB each — served via the `VideoLoop` component
(`components/ui/VideoLoop.tsx`), which autoplays muted/looped and pauses
playback when scrolled out of view via `IntersectionObserver`.

To regenerate from a new export, see the crop/scale/fps values used per
file — they're tuned per-source to frame each capture tightly:

```bash
ffmpeg -i SOURCE.gif -vf "crop=W:H:X:Y,scale=TARGET_W:-2,fps=FPS" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 26 -preset slow \
  -movflags +faststart -an OUTPUT.mp4
```
