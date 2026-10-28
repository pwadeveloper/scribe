export type ThemeMode = 'paper' | 'sepia' | 'night';
export type FontVoice = 'serif' | 'sans' | 'mono';
export type FocusMode = 'off' | 'paragraph' | 'deep';
export type FontSizeStep = 'sm' | 'base' | 'lg' | 'xl';
export type MeasureStep = 'narrow' | 'balanced' | 'wide';

export type WorkKind = 'book' | 'screenplay' | 'essay';
export type WorkspaceViewMode = 'write' | 'birdseye' | 'cabinet';
export type BirdsEyeLayoutMode = 'timeline' | 'cards' | 'cabinet';

export type BookSectionKind =
  | 'prologue'
  | 'chapter'
  | 'interlude'
  | 'epilogue'
  | 'matter';

export interface BookPart {
  id: string;
  title: string; // e.g., "Part I: The Glass Harbor"
}

export interface DocumentUnit {
  id: string;
  title: string;
  /**
   * For 'book': 'prologue' | 'chapter' | 'interlude' | 'epilogue' | 'matter'
   * For 'screenplay': 'scene'
   */
  unitKind: BookSectionKind | 'scene';
  /** Optional custom label for front/back matter (e.g., "Prologue", "Foreword", "Epilogue") */
  customLabel?: string;
  /** Optional reference to a BookPart id (or Act id in a screenplay) */
  partId?: string;
  /** For screenplay scenes: the primary scene heading / slugline, e.g. "INT. OBSERVATORY - NIGHT" */
  slugline?: string;
  /** Optional short synopsis/note shown on Bird's-Eye tile */
  synopsis?: string;
  /** Rich HTML content of the chapter or scene */
  contentHtml: string;
  updatedAt: number;
}

/**
 * Title page fields (Fountain keys). The title itself is the document title.
 * Title, Credit, Author and Source are centered; Contact and Draft date sit
 * lower left; Notes and Copyright lower right.
 */
export interface TitlePage {
  /** TV: the episode title, shown in quotes under the series title. */
  episode?: string;
  /** Byline wording, e.g. "Written by", "Screenplay by", "Teleplay by". */
  credit?: string;
  author?: string;
  /** Source material, e.g. "Based on the novel by Daniel Wallace". */
  source?: string;
  draftDate?: string;
  contact?: string;
  notes?: string;
  copyright?: string;
}

/** Standard production revision colors, in issue order. */
export type RevisionColor =
  | 'White'
  | 'Blue'
  | 'Pink'
  | 'Yellow'
  | 'Green'
  | 'Goldenrod'
  | 'Buff'
  | 'Salmon'
  | 'Cherry'
  | 'Tan';

/**
 * A locked draft to compare against. Each unit stores the "type|text"
 * signature of its printed lines; anything not in the snapshot is revised.
 */
export interface RevisionBaseline {
  lockedAt: number;
  color: RevisionColor;
  units: Record<string, string[]>;
}

/** Page-level options for the paginated screenplay export. */
export interface ScreenplayExportSettings {
  /** Top-left header. Tokens: {title} {date} {revision} {page}. */
  header?: string;
  /** Centered footer. Same tokens as the header. */
  footer?: string;
  /** Page numbers top right ("2."); the first script page is unnumbered. */
  pageNumbers?: boolean;
  /** Scene numbers in both margins (shooting scripts). */
  sceneNumbers?: boolean;
  /** (MORE) and NAME (CONT'D) when a speech breaks across pages. */
  moreContd?: boolean;
  /** (CONT'D) when a character speaks again after an action line. */
  autoContd?: boolean;
  /** Asterisks beside lines changed since the locked draft. */
  revisionMarks?: boolean;
  /** Print the title page first. */
  titlePage?: boolean;
}

export interface DocumentItem {
  id: string;
  kind: WorkKind;
  title: string;
  subtitle?: string;
  pinned?: boolean;
  wordGoal?: number;
  /** Screenplay title page (first printed page) */
  titlePage?: TitlePage;
  /** Screenplay export options (pages, numbers, revisions) */
  screenplayExport?: ScreenplayExportSettings;
  /** Locked draft used for revision marks */
  revisionBaseline?: RevisionBaseline;
  /** Used directly for 'essay' mode (and fallback summary) */
  contentHtml: string;
  /** Optional parts (for books) or acts (for screenplays) */
  parts?: BookPart[];
  /** Ordered list of chapters (for books) or scenes (for screenplays) */
  units?: DocumentUnit[];
  /** Currently focused chapter or scene id when in 'book' or 'screenplay' mode */
  activeUnitId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WriterSettings {
  theme: ThemeMode;
  fontVoice: FontVoice;
  fontSize: FontSizeStep;
  measure: MeasureStep;
  focusMode: FocusMode;
  typewriterMode: boolean;
  wordGoal: number;
  showStats: boolean;
}

export interface TextMetrics {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readingTimeMinutes: number;
}
