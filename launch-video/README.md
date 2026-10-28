# INKubator — "Coming soon" reel

- `INKubator-Coming-Soon-16x9.mp4` — 1920×1080, 30 fps
- `INKubator-Coming-Soon-9x16.mp4` — 1080×1920, 30 fps

Both are cut to `music/Rap Intro.wav` (97 BPM; the beat drops at 9.94 s).

## Editing and re-rendering

`source/comp/main.js` is a single GSAP timeline keyed to the song's beat grid
(`source/comp/beats.js`, produced by `source/analyze.py`). `B(i)` is the time of
beat `i`; every cut and text hit is placed with it. Product shots live in
`source/shots/`.

Preview any moment by opening `source/comp/index.html?format=horizontal`
(or `vertical`) and calling `renderFrame(seconds)` in the console.

To re-render (needs the gstack `browse` CLI and ffmpeg), run from `source/`:

```
python3 render.py horizontal 60      # writes source/frames/horizontal/*.png
./encode.sh horizontal ../INKubator-Coming-Soon-16x9.mp4
```

Frames are captured at 60 fps and blended to 30 fps for motion blur.
