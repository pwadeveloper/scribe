# Vellum

Vellum is a local-first web editor for writing books, screenplays, and essays without UI clutter in the way.

When you start typing, the top header and bottom status pill fade out so only the page and your text remain on screen. Moving the mouse or pressing `Esc` brings the controls back.

## Three writing modes

Every work in Vellum uses one of three structures, chosen when you click **+ New** in the top bar.

### Books and novels

Books are broken into chapters instead of one endless scroll. You write one chapter at a time, and each chapter has its own title, word count, and previous/next turn bar at the bottom of the page.

- **Optional parts.** Most books only need chapters, so parts stay out of the way by default. If your book uses parts (*Part I*, *Part II*), you can add them in the Bird's-Eye View and assign chapters to them.
- **Front and back matter.** Alongside numbered chapters, you can add a Prologue, Epilogue, Interlude, or Foreword.
- **Narrative Timeline & Bird's-Eye View (`Cmd/Ctrl + M`).** Switches from the single-chapter editor to an architectural overview with three switchable layouts:
  - **Timeline**: A vertical narrative spine with sequence badges (`01`, `02`, `03`), cumulative reading/runtime offsets, a proportional top pacing stripboard, Part milestone banners, synopsis fields, and segmented vertical tick-bar word progress meters.
  - **Cards**: A 3-column grid of index cards with status pills, metadata rows, and reorder controls.
  - **Cabinet**: A stacked manila folder drawer for every chapter or scene with a dark monospace inspector card at the top.

### Screenplays

Screenplays are broken into scenes. You focus on one scene at a time and use **Timeline / Bird's-Eye View (`Cmd/Ctrl + M`)** to scan all scenes along a chronological stripboard with `INT.`/`EXT.` badges, atmospheric time-of-day pills (`DAY`, `NIGHT`, `DAWN`, `DUSK`), dialogue block counts, speaking character tags, and scene beats.

Inside a scene, each paragraph carries a screenplay element type (`slugline`, `action`, `character`, `parenthetical`, `dialogue`, or `transition`) styled to standard screenplay indentation:

- **Slugline autocomplete.** Typing `INT.` or `EXT.` opens a keyboard-navigable menu (`Up`/`Down`, `Tab`/`Enter`) for `INT.`, `EXT.`, `INT./EXT.`, locations already used in your script, and times of day (`DAY`, `NIGHT`, `CONTINUOUS`, `DAWN`, `DUSK`, `LATER`).
- **Character and dialogue flow.** Pressing `Tab` on an action line turns it into a centered character cue and suggests character names from the rest of your screenplay, plus vocal extensions like `(V.O.)`, `(O.S.)`, and `(CONT'D)`. Pressing `Enter` after a character cue drops directly into a dialogue block.
- **Parentheticals and transitions.** Typing `(` starts a parenthetical direction. Typing `CUT`, `DISSOLVE`, `FADE`, or `> ` suggests right-aligned transitions (`CUT TO:`, `DISSOLVE TO:`, `SMASH CUT TO:`).
- **Touch and mouse element bar.** A floating pill bar at the bottom of the screen lets you switch the current paragraph between Slugline, Action, Character, Dialogue, Parenthetical, and Transition without keyboard shortcuts.

### Essays

Essays use a single continuous canvas for articles, notes, and long-form prose.

## Project filing cabinet and folder tree

- **Project Filing Cabinet (`Cmd/Ctrl + K`).** Clicking **Cabinet** in the top bar opens the project archive:
  - **Tactile category folders**: Three folder pockets (**Books & Novels**, **Screenplays**, **Essays & Notes**) with peeking paper sheets that animate on hover and filter the cabinet when clicked.
  - **Interactive stacked file cabinet**: Stepped manila folder tabs and die-cut black category dividers (`A–Z ALL`, `BOOKS`, `SCRIPTS`, `ESSAYS`). Hovering or clicking any folder tab raises the folder and updates the dark monospace inspector card (`FILE 001 / 00X`) rising out of the top of the cabinet.
- **Connected folder tree (`Cmd/Ctrl + \`).** The left sidebar drawer switches between **Folders** and **All Works**, displaying connected tree lines (`├─`, `└─`) with item count badges for Books, Screenplays, and Essays, plus nested branches for the active manuscript's chapters or scenes.

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
| `Cmd/Ctrl + M` | Toggle Narrative Timeline & Bird's-Eye View (Books and Screenplays) |
| `Cmd/Ctrl + K` | Toggle Project Filing Cabinet & Folders (or insert link when text is selected) |
| `Cmd/Ctrl + D` | Cycle Focus mode (Off / Paragraph / Spotlight) |
| `Cmd/Ctrl + T` | Toggle Typewriter scrolling |
| `Cmd/Ctrl + \` | Open or close the manuscript folder tree drawer |
| `Cmd/Ctrl + /` | Open the keyboard shortcuts reference |
| `Cmd/Ctrl + B` / `I` / `Shift + X` | Bold, italic, strikethrough |
| `Cmd/Ctrl + E` | Inline code |
| `Cmd/Ctrl + Shift + 9` | Toggle blockquote |
| `# `, `## `, `### ` + `Space` | Heading 1, 2, or 3 |
| `> `, `- `, `1. `, `--- ` + `Space` | Blockquote, bullet list, numbered list, divider |

## Project layout

- `src/App.tsx` manages active documents, chapter/scene state, keyboard shortcuts, and full-work exports.
- `src/components/RichEditor.tsx` renders the `contentEditable` writing canvas, live Markdown triggers, focus dimming, typewriter scroll, and chapter/scene turn bars.
- `src/components/BirdsEyeView.tsx` renders the Narrative Timeline, Cards, and section Cabinet views along with the top pacing stripboard and optional book part groups.
- `src/components/ProjectCabinetView.tsx` renders the tactile category folder pockets, the stacked filing cabinet drawer with dark monospace inspector cards, and the reusable `SegmentedTickMeter`.
- `src/components/SidebarDrawer.tsx` renders the `Folders | All Works` switcher and connected category/unit tree hierarchy.
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
