export type ThemeMode = 'paper' | 'sepia' | 'night';
export type FontVoice = 'serif' | 'sans' | 'mono';
export type FocusMode = 'off' | 'paragraph' | 'deep';
export type FontSizeStep = 'sm' | 'base' | 'lg' | 'xl';
export type MeasureStep = 'narrow' | 'balanced' | 'wide';

export type WorkKind = 'book' | 'screenplay' | 'essay';
export type WorkspaceViewMode = 'write' | 'birdseye';

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

export interface DocumentItem {
  id: string;
  kind: WorkKind;
  title: string;
  subtitle?: string;
  pinned?: boolean;
  wordGoal?: number;
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
