# Vellum

Vellum is a local-first web editor for writing books, screenplays, and essays without UI clutter in the way.

When you start typing, the top header and bottom status pill fade out so only the page and your text remain on screen. Moving the mouse or pressing `Esc` brings the controls back.

## Three writing modes

Every work in Vellum uses one of three structures, chosen when you click **+ New** in the top bar.

### Books and novels

Books are broken into chapters instead of one endless scroll. You write one chapter at a time, and each chapter has its own title, word count, and previous/next turn bar at the bottom of the page.

- **Optional parts.** Most books only need chapters, so parts stay out of the way by default. If your book uses parts (*Part I*, *Part II*), you can add them in the Bird's-Eye View and assign chapters to them.
- **Front and back matter.** Alongside numbered chapters, you can add a Prologue, Epilogue, Interlude, or Foreword.
- **Bird's-Eye View (`Cmd/Ctrl + M`).** Switches from the single-chapter editor to a grid of chapter tiles. Each tile shows the section badge, title, a live excerpt of the prose, an editable synopsis field, and reorder buttons (`<-` and `->`). Clicking any tile jumps straight into that chapter.

### Screenplays

Screenplays are broken into scenes. You focus on one scene at a time and use **Bird's-Eye View (`Cmd/Ctrl + M`)** to scan all scenes as index cards with their sluglines, speaking character tags, and scene notes.

Inside a scene, each paragraph carries a screenplay element type (`slugline`, `action`, `character`, `parenthetical`, `dialogue`, or `transition`) styled to standard screenplay indentation:

- **Slugline autocomplete.** Typing `INT.` or `EXT.` opens a keyboard-navigable menu (`Up`/`Down`, `Tab`/`Enter`) for `INT.`, `EXT.`, `INT./EXT.`, locations already used in your script, and times of day (`DAY`, `NIGHT`, `CONTINUOUS`, `DAWN`, `DUSK`, `LATER`).
- **Character and dialogue flow.** Pressing `Tab` on an action line turns it into a centered character cue and suggests character names from the rest of your screenplay, plus vocal extensions like `(V.O.)`, `(O.S.)`, and `(CONT'D)`. Pressing `Enter` after a character cue drops directly into a dialogue block.
- **Parentheticals and transitions.** Typing `(` starts a parenthetical direction. Typing `CUT`, `DISSOLVE`, `FADE`, or `> ` suggests right-aligned transitions (`CUT TO:`, `DISSOLVE TO:`, `SMASH CUT TO:`).
- **Touch and mouse element bar.** A floating pill bar at the bottom of the screen lets you switch the current paragraph between Slugline, Action, Character, Dialogue, Parenthetical, and Transition without keyboard shortcuts.

### Essays

Essays use a single continuous canvas for articles, notes, and long-form prose.

## Margin outline scanner

Along the left edge of the viewport sits a column of horizontal tick marks, modeled after Dropbox Paper. The active section is marked with a wider accent bar.

Hovering over the ticks on desktop, or tapping them on a phone, expands the ticks into a clickable list of chapters, scenes, and `H1`/`H2`/`H3` headings. Clicking any entry scrolls to that section.

## Focus, typography, and themes

- **Focus mode (`Cmd/Ctrl + D`).** Cycles between Off, Paragraph focus (dims every block except the active paragraph to `0.24` opacity), and Spotlight (dims distant blocks to `0.14` and adjacent blocks to `0.36`).
- **Typewriter scrolling (`Cmd/Ctrl + T`).** Keeps the active line anchored near 44% of the viewport height while you type.
- **Paper themes.** Switches CSS variables between **Paper** (`#FAF7F2`), **Sepia** (`#F3ECE0`), and **Night** (`#141312`). An inline script in `index.html` applies the saved theme and `<meta name="theme-color">` before first paint so the page never flashes on reload.
- **Typeface voices and measure.** The `Aa` menu switches between *Newsreader* (serif), *Plus Jakarta Sans* (sans), and *JetBrains Mono* (mono), with four font sizes (`17px` to `24px`) and three column widths (`56ch`, `65ch`, `74ch`).

## Storage and export

All manuscripts and settings save locally in `localStorage` for synchronous initial render and back up to `IndexedDB` (`VellumWriterDB`) so longer books do not hit storage quotas.

From the export menu in the top bar, you can copy or download the full work as:

- Markdown (`.md`)
- Plain text (`.txt`)
- Standalone HTML (`.html`)
- Printed page or PDF (`Cmd/Ctrl + P`) via `@media print` rules that strip all UI chrome

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + M` | Toggle Bird's-Eye View (Books and Screenplays) |
| `Cmd/Ctrl + D` | Cycle Focus mode (Off / Paragraph / Spotlight) |
| `Cmd/Ctrl + T` | Toggle Typewriter scrolling |
| `Cmd/Ctrl + \` | Open or close the manuscript library drawer |
| `Cmd/Ctrl + /` | Open the keyboard shortcuts reference |
| `Cmd/Ctrl + B` / `I` / `Shift + X` | Bold, italic, strikethrough |
| `Cmd/Ctrl + E` | Inline code |
| `Cmd/Ctrl + Shift + 9` | Toggle blockquote |
| `# `, `## `, `### ` + `Space` | Heading 1, 2, or 3 |
| `> `, `- `, `1. `, `--- ` + `Space` | Blockquote, bullet list, numbered list, divider |

## Project layout

- `src/App.tsx` manages active documents, chapter/scene state, keyboard shortcuts, and full-work exports.
- `src/components/RichEditor.tsx` renders the `contentEditable` writing canvas, live Markdown triggers, focus dimming, typewriter scroll, and chapter/scene turn bars.
- `src/components/BirdsEyeView.tsx` renders the chapter and scene tile grid and optional book part groups.
- `src/components/ScreenplayTools.tsx` provides the slugline/character/transition autocomplete engine and the screenplay element switcher bar.
- `src/components/DocumentOutline.tsx` scans live headings and units to render the left-margin tick marks and expandable outline.
- `src/components/FloatingToolbar.tsx` positions the selection formatting toolbar above highlighted text.
- `src/motion.ts` wraps GSAP hover, press, and reduced-motion checks.
- `src/storage.ts` handles `localStorage` and `IndexedDB` persistence plus starter works.

## Running locally

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

Build the production bundle:

```bash
npm run build
```
