import { DocumentItem, WriterSettings, WorkKind } from './types';

const SETTINGS_KEY = 'vellum:settings';
const DOCS_KEY = 'vellum:documents';
const ACTIVE_DOC_KEY = 'vellum:activeDocId';

const DB_NAME = 'VellumWriterDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

export const DEFAULT_SETTINGS: WriterSettings = {
  theme: 'paper',
  fontVoice: 'serif',
  fontSize: 'lg',
  measure: 'balanced',
  focusMode: 'off',
  typewriterMode: false,
  wordGoal: 1000,
  showStats: true,
};

export const STARTER_BOOK: DocumentItem = {
  id: 'doc-starter-book',
  kind: 'book',
  title: 'The Cartographer of Tides',
  subtitle: 'A Novel in Two Parts',
  pinned: true,
  wordGoal: 1500,
  createdAt: Date.now() - 7200_000,
  updatedAt: Date.now() - 600_000,
  contentHtml: '',
  parts: [
    { id: 'part-1', title: 'Part I: The Sounding Line' },
    { id: 'part-2', title: 'Part II: High Water' },
  ],
  activeUnitId: 'unit-ch-1',
  units: [
    {
      id: 'unit-prologue',
      unitKind: 'prologue',
      customLabel: 'Prologue',
      title: 'Before the Lighthouse Fell',
      partId: 'part-1',
      synopsis: 'An old brass sextant washes ashore at low tide on the northern spit.',
      updatedAt: Date.now() - 3600_000,
      contentHtml: `<p>Long before the survey ships arrived with their iron-hulled sounders, the fishermen of Oakhaven measured the channel by the pitch of the surf against the basalt bells.</p>
<p>On a Tuesday in November when the fog lay flat as linen across the estuary, a boy named Julian found a brass instrument wedged between two ribs of a wrecked dory. Its mirrors were clouded with salt, yet the vernier scale still turned with a quiet, greased click.</p>`,
    },
    {
      id: 'unit-ch-1',
      unitKind: 'chapter',
      title: 'The Glass Harbor',
      partId: 'part-1',
      synopsis: 'Clara arrives at the winter charting office and discovers the missing ledger.',
      updatedAt: Date.now() - 2800_000,
      contentHtml: `<p>The charting office smelled of boiled linseed, cedar shavings, and the damp wool of three generations of harbor pilots. Clara set her valise beside the coal stove and waited for the clerk to look up from his ruling pen.</p>
<h2>The Missing Soundings</h2>
<p>Along the western wall hung seventeen copperplate engravings of the coast. Sixteen were black with ink and sea-stain; the seventeenth—covering the shoals beyond Gull Rock—was an empty mahogany frame.</p>
<p>“We don’t draw that reach anymore,” the clerk said without lifting his eyes. “The sand moves faster than the press can dry.”</p>
<h3>The Red Ledger</h3>
<p>Behind the counter rested a calfskin book bound with braided twine. When Clara opened its cover, every depth measurement had been crossed out and rewritten in red carmine ink.</p>`,
    },
    {
      id: 'unit-ch-2',
      unitKind: 'chapter',
      title: 'Letters to the Meridian',
      partId: 'part-1',
      synopsis: 'A correspondence tucked inside the sea chest points toward the outer islands.',
      updatedAt: Date.now() - 2100_000,
      contentHtml: `<p>That evening the wind backed into the northeast, rattling the storm shutters along the quay. By the light of a single gimbaled lamp, Clara unfolded the four letters she had slipped from the back pocket of the red ledger.</p>
<h2>First Letter: October 14</h2>
<p>Each sheet was watermarked with a compass rose and written in a cramped, slanting hand that grew steadier whenever the author spoke of the tides.</p>
<blockquote>“Do not trust the lead-line at the third hour of the ebb. There is a current beneath the surface that carries the weight sideways before it ever touches bottom.”</blockquote>`,
    },
    {
      id: 'unit-ch-3',
      unitKind: 'chapter',
      title: 'A Bell Under Water',
      partId: 'part-2',
      synopsis: 'Crossing the bar in the mail launch as the equinox tide begins to turn.',
      updatedAt: Date.now() - 1500_000,
      contentHtml: `<p>At dawn the mail launch cast off from the stone slip. Julian stood at the tiller with his collar turned up against the spray while Clara braced her charting board against the forward thwart.</p>
<h2>Beyond the Breakwater</h2>
<p>Once they cleared thegranite mole, the swell lengthened into slow, slate-colored ridges. Below the keel, faint and regular as a cathedral clock, came the submerged tolling of the bell buoy on the outer bar.</p>`,
    },
    {
      id: 'unit-ch-4',
      unitKind: 'chapter',
      title: 'TheSeventh Sounding',
      partId: 'part-2',
      synopsis: 'At the edge of the chart, the true shape of the channel reveals itself.',
      updatedAt: Date.now() - 900_000,
      contentHtml: `<p>Seven fathoms, then four, then twenty-two. Clara called the numbers aloud while Julian held the launch head-to-wind with short, practiced strokes of the throttle.</p>
<p>There was no shoal where the Admiralty map promised dry sand—only a deep, sheltered trench carved through the limestone like a sunken street.</p>`,
    },
    {
      id: 'unit-epilogue',
      unitKind: 'epilogue',
      customLabel: 'Epilogue',
      title: 'Spring Equinoctial',
      partId: 'part-2',
      synopsis: 'The seventeenth copperplate is hung back in the harbor office.',
      updatedAt: Date.now() - 600_000,
      contentHtml: `<p>In April the light returned to the firth. On the morning the first coastal packet steamed through the new passage, Clara drove a fresh brass hook into the wainscoting of the charting room and hung the seventeenth map in its frame.</p>`,
    },
  ],
};

export const STARTER_SCREENPLAY: DocumentItem = {
  id: 'doc-starter-screenplay',
  kind: 'screenplay',
  title: 'NIGHT FREQUENCY',
  subtitle: 'Written for the Screen',
  pinned: true,
  wordGoal: 1200,
  createdAt: Date.now() - 5400_000,
  updatedAt: Date.now() - 300_000,
  contentHtml: '',
  activeUnitId: 'scene-1',
  units: [
    {
      id: 'scene-1',
      unitKind: 'scene',
      slugline: 'INT. MAGNETIC TAPE ARCHIVE - NIGHT',
      title: 'The Unlabeled Reel',
      synopsis: 'Elena discovers a 1974 broadcast reel spinning on an unplugged console.',
      updatedAt: Date.now() - 1800_000,
      contentHtml: `<p data-sp-type="slugline">INT. MAGNETIC TAPE ARCHIVE - NIGHT</p>
<p data-sp-type="action">Rows of galvanized steel shelves stretch into amber darkness. Fluorescent tubes hum overhead. ELENA VANCE (34), sleeves rolled, fingers stained with splicing chalk, threads a quarter-inch reel onto a Studer deck.</p>
<p data-sp-type="character">ELENA</p>
<p data-sp-type="parenthetical">(into voice recorder)</p>
<p data-sp-type="dialogue">Reel forty-seven, Sub-basement C. No catalog card. Oxide layer intact.</p>
<p data-sp-type="action">She presses PLAY. Static fills the small monitor speaker—then a clear, rhythmic three-note chime repeats every four seconds.</p>
<p data-sp-type="character">MARCUS (O.S.)</p>
<p data-sp-type="dialogue">You’re supposed to log the municipal hearings before midnight, Elena.</p>
<p data-sp-type="action">Elena doesn’t flinch. MARCUS (50s), night supervisor, stands in the doorway holding a keyring and a paper cup of coffee.</p>
<p data-sp-type="character">ELENA</p>
<p data-sp-type="dialogue">Listen to the carrier wave underneath the chime. That’s not a city council microphone.</p>
<p data-sp-type="character">MARCUS</p>
<p data-sp-type="parenthetical">(stepping closer)</p>
<p data-sp-type="dialogue">Where did you pull that box?</p>
<p data-sp-type="transition">CUT TO:</p>`,
    },
    {
      id: 'scene-2',
      unitKind: 'scene',
      slugline: 'EXT. ROOFTOP RELAY TOWER - CONTINUOUS',
      title: 'Signal in the Rain',
      synopsis: 'Elena traces the coaxial line up to the decommissioned microwave horn.',
      updatedAt: Date.now() - 1200_000,
      contentHtml: `<p data-sp-type="slugline">EXT. ROOFTOP RELAY TOWER - CONTINUOUS</p>
<p data-sp-type="action">Fine mist blows across the gravel roof. Beyond the parapet, the harbor bridge glows through fog. Elena follows a thick black coaxial cable from the stairwell bulkhead to the base of a rusted microwave horn.</p>
<p data-sp-type="character">ELENA</p>
<p data-sp-type="dialogue">The junction box is warm. Someone replaced the copper fuse this week.</p>
<p data-sp-type="character">MARCUS</p>
<p data-sp-type="dialogue">That dish hasn’t been wired to the grid since the port authority moved out in ’98.</p>
<p data-sp-type="action">A red indicator neon inside the weatherproof glass flickers—once, twice—in exact time with the three-note chime.</p>
<p data-sp-type="transition">DISSOLVE TO:</p>`,
    },
    {
      id: 'scene-3',
      unitKind: 'scene',
      slugline: 'INT. HARBOR DINER - DAWN',
      title: 'The Engineer’s Notebook',
      synopsis: 'Over black coffee, retired broadcast engineer Arthur decodes the station ID.',
      updatedAt: Date.now() - 600_000,
      contentHtml: `<p data-sp-type="slugline">INT. HARBOR DINER - DAWN</p>
<p data-sp-type="action">Rain streaks the fogged plate glass. ARTHUR COLE (70s), wool cardigan, hearing aid whistling faintly, adjusts his spectacles over a laminated frequency chart spread between two coffee mugs.</p>
<p data-sp-type="character">ARTHUR</p>
<p data-sp-type="dialogue">We called it the Lighthouse Loop. Every coastal station kept an automated tape running so ships could calibrate their direction finders in zero visibility.</p>
<p data-sp-type="character">ELENA</p>
<p data-sp-type="dialogue">Except the voice at the end of the reel uses my father’s call sign.</p>
<p data-sp-type="character">ARTHUR</p>
<p data-sp-type="parenthetical">(quietly)</p>
<p data-sp-type="dialogue">Your father built the transmitter on Gull Island, Elena. He never dismantled it.</p>
<p data-sp-type="transition">CUT TO:</p>`,
    },
  ],
};

export const STARTER_ESSAY: DocumentItem = {
  id: 'doc-welcome-vellum',
  kind: 'essay',
  title: 'On the Quiet of the Blank Page',
  pinned: false,
  wordGoal: 500,
  createdAt: Date.now() - 3600_000,
  updatedAt: Date.now() - 1800_000,
  contentHtml: `<p>Every good sentence begins in silence. When the surrounding chrome disappears—when notifications, sidebars, and blinking toolbars step out of the room—thought slows down just enough to find its real cadence.</p>
<p><strong>INKubator</strong> is a quiet room for writing books, screenplays, and essays. Start typing anywhere and the interface gently recedes, leaving only warm paper and ink. Move your cursor or press <code>Esc</code> whenever you want your tools back.</p>
<h2>Three Ways to Write</h2>
<p>Whether you are structuring a multi-chapter novel, formatting dialogue in a screenplay scene, or drafting a long-form essay, the workspace adapts to the form of your work:</p>
<ul>
<li><strong>Book Mode</strong> divides your manuscript into optional <em>Parts</em>, <em>Chapters</em>, and front/back matter (Prologue, Epilogue), with a <strong>Bird’s-Eye View</strong> tile grid to fly from Chapter 1 to Chapter 5.</li>
<li><strong>Screenplay Mode</strong> focuses on one <em>Scene</em> at a time with smart autocomplete for <code>INT.</code> / <code>EXT.</code> sluglines, character cues, dialogue columns, and transitions.</li>
<li><strong>Essay Mode</strong> gives you a continuous editorial canvas with a Dropbox Paper–style margin outline scanner.</li>
</ul>
<blockquote>“A sentence should contain no unnecessary words, a paragraph no unnecessary sentences, for the same reason that a drawing should have no unnecessary lines.”</blockquote>`,
};

export interface NewWorkOptions {
  includeParts?: boolean;
  includePrologue?: boolean;
  includeOpeningSlugline?: boolean;
  includeStarterHeadings?: boolean;
  openInTimeline?: boolean;
  startInFocusMode?: boolean;
  pinToLibrary?: boolean;
  wordGoal?: number;
}

export function createNewWorkItem(
  kind: WorkKind,
  title: string,
  options?: NewWorkOptions
): DocumentItem {
  const now = Date.now();
  const id = `doc-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const pinned = Boolean(options?.pinToLibrary);

  if (kind === 'book') {
    const partId = options?.includeParts ? `part-${now}-1` : undefined;
    const prologueId = `unit-${now}-0`;
    const ch1Id = `unit-${now}-1`;
    const units = [
      ...(options?.includePrologue
        ? [
            {
              id: prologueId,
              unitKind: 'prologue' as const,
              title: 'Prologue',
              partId,
              synopsis: '',
              contentHtml: '<p><br></p>',
              updatedAt: now,
            },
          ]
        : []),
      {
        id: ch1Id,
        unitKind: 'chapter' as const,
        title: 'Chapter One',
        partId,
        synopsis: '',
        contentHtml: '<p><br></p>',
        updatedAt: now,
      },
    ];

    return {
      id,
      kind: 'book',
      title: title.trim() || 'Untitled Novel',
      pinned,
      wordGoal: options?.wordGoal ?? 1500,
      contentHtml: '',
      parts: options?.includeParts
        ? [{ id: partId!, title: 'Part I' }]
        : [],
      activeUnitId: options?.includePrologue ? prologueId : ch1Id,
      units,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (kind === 'screenplay') {
    const sc1Id = `scene-${now}-1`;
    const useSlug = options?.includeOpeningSlugline !== false;
    return {
      id,
      kind: 'screenplay',
      title: (title.trim() || 'UNTITLED SCREENPLAY').toUpperCase(),
      pinned,
      wordGoal: options?.wordGoal ?? 1000,
      contentHtml: '',
      activeUnitId: sc1Id,
      units: [
        {
          id: sc1Id,
          unitKind: 'scene',
          slugline: useSlug ? 'INT. LOCATION - DAY' : '',
          title: 'Opening Scene',
          synopsis: '',
          contentHtml: useSlug
            ? '<p data-sp-type="slugline">INT. LOCATION - DAY</p><p data-sp-type="action"><br></p>'
            : '<p data-sp-type="slugline"><br></p>',
          updatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
  }

  const starterEssayHtml = options?.includeStarterHeadings
    ? '<h2>I. Premise</h2><p><br></p><h2>II. Exploration</h2><p><br></p><h2>III. Conclusion</h2><p><br></p>'
    : '<p><br></p>';

  return {
    id,
    kind: 'essay',
    title: title.trim() || '',
    pinned,
    wordGoal: options?.wordGoal ?? 500,
    contentHtml: starterEssayHtml,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeLegacyDocuments(docs: DocumentItem[]): DocumentItem[] {
  const normalized = docs.map((d) => {
    if (!d.kind) {
      return { ...d, kind: 'essay' as WorkKind };
    }
    return d;
  });

  const hasBook = normalized.some((d) => d.kind === 'book');
  const hasScreenplay = normalized.some((d) => d.kind === 'screenplay');

  const result = [...normalized];
  if (!hasScreenplay) {
    result.unshift(STARTER_SCREENPLAY);
  }
  if (!hasBook) {
    result.unshift(STARTER_BOOK);
  }
  return result;
}

export function loadSettings(): WriterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: WriterSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function loadDocumentsSync(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (!raw) {
      const defaults = [STARTER_BOOK, STARTER_SCREENPLAY, STARTER_ESSAY];
      localStorage.setItem(DOCS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw) as DocumentItem[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      const upgraded = normalizeLegacyDocuments(parsed);
      localStorage.setItem(DOCS_KEY, JSON.stringify(upgraded));
      return upgraded;
    }
    return [STARTER_BOOK, STARTER_SCREENPLAY, STARTER_ESSAY];
  } catch {
    return [STARTER_BOOK, STARTER_SCREENPLAY, STARTER_ESSAY];
  }
}

export function loadActiveDocIdSync(docs: DocumentItem[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_DOC_KEY);
    if (saved && docs.some((d) => d.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore
  }
  return docs[0]?.id ?? STARTER_BOOK.id;
}

export function saveActiveDocIdSync(id: string): void {
  try {
    localStorage.setItem(ACTIVE_DOC_KEY, id);
  } catch {
    // Ignore
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveDocuments(docs: DocumentItem[]): Promise<void> {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch {
    // Fallback to IndexedDB if localStorage quota exceeded
  }

  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const doc of docs) {
        store.put(doc);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function hydrateDocumentsFromIndexedDB(): Promise<DocumentItem[] | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = req.result as DocumentItem[] | undefined;
        if (res && res.length > 0) {
          const normalized = normalizeLegacyDocuments(res);
          resolve(normalized);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
