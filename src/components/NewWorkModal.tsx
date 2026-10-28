import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Film,
  Feather,
  X,
  Check,
  Layers,
  BookMarked,
  Clapperboard,
  GitCommitHorizontal,
  ListTree,
  Eye,
  Pin,
  RotateCcw,
} from 'lucide-react';
import { WorkKind } from '../types';
import { canHover, prefersReducedMotion } from '../motion';
import { Tone, WORK_KIND_TONE, toneChip, toneVar } from '../palette';
import { NewWorkOptions } from '../storage';

interface NewWorkModalProps {
  open: boolean;
  defaultKind?: WorkKind;
  onClose: () => void;
  onCreateWork: (
    kind: WorkKind,
    title: string,
    options?: NewWorkOptions
  ) => void;
}

const DEFAULT_WORD_GOALS: Record<WorkKind, number> = {
  book: 1500,
  screenplay: 1000,
  essay: 500,
};

const GOAL_SWATCHES: {
  value: number;
  shortLabel: string;
  tone: Tone;
}[] = [
  { value: 500, shortLabel: '500', tone: 'sky' },
  { value: 1000, shortLabel: '1k', tone: 'lavender' },
  { value: 1500, shortLabel: '1.5k', tone: 'butter' },
  { value: 2500, shortLabel: '2.5k', tone: 'sage' },
  { value: 5000, shortLabel: '5k', tone: 'blush' },
];

export const NewWorkModal: React.FC<NewWorkModalProps> = ({
  open,
  defaultKind,
  onClose,
  onCreateWork,
}) => {
  // Keep modal mounted through its 165ms exit transition so it never cuts to display:none
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(false);

  const [selectedKind, setSelectedKind] = useState<WorkKind>(
    defaultKind || 'book'
  );
  const [title, setTitle] = useState('');
  const [wordGoal, setWordGoal] = useState<number>(
    DEFAULT_WORD_GOALS[defaultKind || 'book']
  );

  // Format-aware & universal toggles
  const [includeParts, setIncludeParts] = useState(false);
  const [includePrologue, setIncludePrologue] = useState(false);
  const [includeOpeningSlugline, setIncludeOpeningSlugline] = useState(true);
  const [openInTimeline, setOpenInTimeline] = useState(false);
  const [includeStarterHeadings, setIncludeStarterHeadings] = useState(false);
  const [startInFocusMode, setStartInFocusMode] = useState(false);
  const [pinToLibrary, setPinToLibrary] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form fields when modal opens
  useEffect(() => {
    if (!open) return;
    const nextKind = defaultKind || 'book';
    setSelectedKind(nextKind);
    setTitle('');
    setWordGoal(DEFAULT_WORD_GOALS[nextKind]);
    setIncludeParts(false);
    setIncludePrologue(false);
    setIncludeOpeningSlugline(true);
    setOpenInTimeline(false);
    setIncludeStarterHeadings(false);
    setStartInFocusMode(false);
  }, [open, defaultKind]);

  // Sync mount & visibility lifecycle with enter (220ms ease-out) and exit (160ms ease-out)
  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (open) {
      setShouldRender(true);
      if (reduced) {
        setIsVisible(true);
      } else {
        let raf2 = 0;
        const raf1 = window.requestAnimationFrame(() => {
          raf2 = window.requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
        return () => {
          window.cancelAnimationFrame(raf1);
          window.cancelAnimationFrame(raf2);
        };
      }
    } else {
      setIsVisible(false);
      if (reduced) {
        setShouldRender(false);
      } else {
        const timer = window.setTimeout(() => {
          setShouldRender(false);
        }, 170);
        return () => window.clearTimeout(timer);
      }
    }
  }, [open]);

  // Focus title input on desktop and wire Escape key
  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      if (canHover()) {
        inputRef.current?.focus();
      }
    }, 80);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const handleSelectKind = (kind: WorkKind) => {
    setSelectedKind(kind);
    // Update default word goal if it was still on the previous kind's default
    if (
      wordGoal === DEFAULT_WORD_GOALS.book ||
      wordGoal === DEFAULT_WORD_GOALS.screenplay ||
      wordGoal === DEFAULT_WORD_GOALS.essay
    ) {
      setWordGoal(DEFAULT_WORD_GOALS[kind]);
    }
  };

  const handleResetDefaults = () => {
    const initialKind = defaultKind || 'book';
    setSelectedKind(initialKind);
    setTitle('');
    setWordGoal(DEFAULT_WORD_GOALS[initialKind]);
    setIncludeParts(false);
    setIncludePrologue(false);
    setIncludeOpeningSlugline(true);
    setOpenInTimeline(false);
    setIncludeStarterHeadings(false);
    setStartInFocusMode(false);
    setPinToLibrary(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateWork(selectedKind, title, {
      includeParts,
      includePrologue,
      includeOpeningSlugline,
      openInTimeline,
      includeStarterHeadings,
      startInFocusMode,
      pinToLibrary,
      wordGoal,
    });
    onClose();
  };

  if (!shouldRender) return null;

  const activeTone = WORK_KIND_TONE[selectedKind];

  const formats: {
    id: WorkKind;
    name: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  }[] = [
    {
      id: 'book',
      name: 'Book',
      sublabel: 'Chapters & Parts',
      icon: BookOpen,
    },
    {
      id: 'screenplay',
      name: 'Screenplay',
      sublabel: 'Scene by Scene',
      icon: Film,
    },
    {
      id: 'essay',
      name: 'Essay',
      sublabel: 'Continuous Sheet',
      icon: Feather,
    },
  ];

  // Dynamic toggle rows for the bottom section (matching the 3-row toggle layout)
  const toggleRows =
    selectedKind === 'book'
      ? [
          {
            id: 'book-parts',
            icon: Layers,
            label: 'Divide into Parts',
            hint: 'Part I, Part II…',
            checked: includeParts,
            onChange: setIncludeParts,
          },
          {
            id: 'book-prologue',
            icon: BookMarked,
            label: 'Include a Prologue',
            hint: 'Before Chapter 1',
            checked: includePrologue,
            onChange: setIncludePrologue,
          },
          {
            id: 'pin-library',
            icon: Pin,
            label: 'Pin to top of archive',
            hint: 'Sidebar & cabinet',
            checked: pinToLibrary,
            onChange: setPinToLibrary,
          },
        ]
      : selectedKind === 'screenplay'
      ? [
          {
            id: 'sp-slugline',
            icon: Clapperboard,
            label: 'Start with opening slugline',
            hint: 'INT. LOCATION - DAY',
            checked: includeOpeningSlugline,
            onChange: setIncludeOpeningSlugline,
          },
          {
            id: 'sp-timeline',
            icon: GitCommitHorizontal,
            label: 'Open in Narrative Timeline',
            hint: 'Scene stripboard',
            checked: openInTimeline,
            onChange: setOpenInTimeline,
          },
          {
            id: 'pin-library',
            icon: Pin,
            label: 'Pin to top of archive',
            hint: 'Sidebar & cabinet',
            checked: pinToLibrary,
            onChange: setPinToLibrary,
          },
        ]
      : [
          {
            id: 'essay-headings',
            icon: ListTree,
            label: 'Start with section headings',
            hint: 'H2 outline markers',
            checked: includeStarterHeadings,
            onChange: setIncludeStarterHeadings,
          },
          {
            id: 'essay-focus',
            icon: Eye,
            label: 'Paragraph Focus Mode',
            hint: 'Dim inactive blocks',
            checked: startInFocusMode,
            onChange: setStartInFocusMode,
          },
          {
            id: 'pin-library',
            icon: Pin,
            label: 'Pin to top of archive',
            hint: 'Sidebar & cabinet',
            checked: pinToLibrary,
            onChange: setPinToLibrary,
          },
        ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-work-dialog-title"
      style={{ zIndex: 'var(--z-modal)' }}
      className="no-print fixed inset-0 flex items-center justify-center p-4"
    >
      {/* Paired Backdrop — matches modal enter/exit timing */}
      <div
        onClick={onClose}
        style={{
          opacity: isVisible ? 1 : 0,
          transition: isVisible
            ? 'opacity 220ms cubic-bezier(0.32, 0.72, 0, 1)'
            : 'opacity 160ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px] motion-reduce:!transition-none"
      />

      {/* Dialog Surface */}
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${toneVar(
            activeTone
          )} 24%, var(--bg-elevated)) 0%, var(--bg-elevated) 130px)`,
          boxShadow: 'var(--elevation-floating)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible
            ? 'scale(1) translateY(0px)'
            : open
            ? 'scale(0.96) translateY(8px)'
            : 'scale(0.97) translateY(-6px)',
          transition: isVisible
            ? 'opacity 220ms cubic-bezier(0.32, 0.72, 0, 1), transform 220ms cubic-bezier(0.32, 0.72, 0, 1), background-image 200ms ease-out'
            : 'opacity 160ms cubic-bezier(0.32, 0.72, 0, 1), transform 160ms cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform, opacity',
        }}
        className="vellum-scroller relative max-h-[92dvh] w-full max-w-[500px] overflow-y-auto rounded-[22px] p-5 sm:p-6 motion-reduce:!transform-none motion-reduce:!transition-none"
      >
        {/* Header Section */}
        <div
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
          className=" flex items-start justify-between gap-3 pb-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="new-work-dialog-title"
                className="font-serif text-xl font-semibold tracking-tight text-[var(--ink-1)] sm:text-[22px]"
              >
                New Manuscript
              </h2>
              <span
                style={toneChip(activeTone)}
                className="inline-flex h-5 items-center rounded-full px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150"
              >
                {selectedKind}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--ink-3)]">
              Set or customize the structure and preferences for your work
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--ink-3)] transition-[transform,background-color,color] duration-150 ease-out before:absolute before:-inset-1.5 hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)] active:scale-[0.95]"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Row 1: Working Title (Two-column row like Language in reference) */}
          <div
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
            className="flex flex-col gap-2.5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <label
                htmlFor="new-work-title"
                className="block text-[13px] font-semibold text-[var(--ink-1)]"
              >
                Working title
              </label>
              <p className="mt-0.5 text-xs text-[var(--ink-3)]">
                {selectedKind === 'book'
                  ? 'Name your novel or leave blank'
                  : selectedKind === 'screenplay'
                  ? 'Formatted in uppercase on title page'
                  : 'Headline at the top of your sheet'}
              </p>
            </div>

            <div className="w-full sm:w-56 shrink-0">
              <input
                ref={inputRef}
                id="new-work-title"
                type="text"
                enterKeyHint="done"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  selectedKind === 'book'
                    ? 'The Cartographer of Tides'
                    : selectedKind === 'screenplay'
                    ? 'NIGHT FREQUENCY'
                    : 'On the Quiet Page'
                }
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  boxShadow:
                    'inset 0 0 0 var(--border-hairline) var(--border-strong)',
                }}
                className="h-9 w-full rounded-xl px-3 text-base font-medium text-[var(--ink-1)] transition-shadow duration-150 placeholder:font-normal placeholder:text-[var(--ink-4)] focus:outline-none focus:ring-2 focus:ring-[var(--ink-1)] sm:text-xs"
              />
            </div>
          </div>

          {/* Row 2: Writing Format — 3 Visual Miniature Window Previews */}
          <div
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
            className="py-4"
          >
            <div className="mb-3">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">
                Manuscript format
              </div>
              <p className="mt-0.5 text-xs text-[var(--ink-3)]">
                Customize your writing canvas and section layout
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Manuscript format"
              className="grid grid-cols-3 gap-2.5 sm:gap-3"
            >
              {formats.map((fmt) => {
                const active = selectedKind === fmt.id;
                const tone = WORK_KIND_TONE[fmt.id];
                const Icon = fmt.icon;

                return (
                  <button
                    key={fmt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSelectKind(fmt.id)}
                    className="group flex flex-col items-center text-center focus-visible:outline-none"
                  >
                    {/* Visual Miniature Window Frame */}
                    <div
                      style={{
                        backgroundColor: active
                          ? `color-mix(in srgb, ${toneVar(tone)} 68%, var(--bg-surface))`
                          : `color-mix(in srgb, ${toneVar(tone)} 32%, var(--bg-surface))`,
                        boxShadow: active
                          ? `0 0 0 1.5px var(--ink-1), 0 0 0 4px color-mix(in srgb, ${toneVar(
                              tone
                            )} 45%, transparent)`
                          : 'inset 0 0 0 var(--border-hairline) var(--border-strong)',
                      }}
                      className="relative aspect-[16/11] w-full overflow-hidden rounded-xl p-1.5 transition-[box-shadow,background-color,transform] duration-150 ease-out group-focus-visible:ring-2 group-focus-visible:ring-[var(--ink-1)] group-active:scale-[0.97]"
                    >
                      {/* Soft left-side tint strip (like the Auto/Light/Dark split in reference) */}
                      <div
                        aria-hidden="true"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${toneVar(
                            tone
                          )} 85%, transparent)`,
                        }}
                        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-60"
                      />

                      {/* Miniature App Window Sheet */}
                      <div
                        aria-hidden="true"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          boxShadow:
                            '0 0 0 0.5px var(--border-strong), 0 4px 10px -2px rgba(0,0,0,0.08)',
                        }}
                        className="relative ml-2.5 mt-1.5 flex h-full w-full flex-col rounded-tl-lg p-2 text-start transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.015]"
                      >
                        {/* Window Header Dots + Format Icon */}
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <span className="size-1 rounded-full bg-[var(--ink-4)] opacity-60" />
                            <span className="size-1 rounded-full bg-[var(--ink-4)] opacity-40" />
                            <span className="size-1 rounded-full bg-[var(--ink-4)] opacity-25" />
                          </div>
                          <Icon
                            className="size-2.5 text-[var(--ink-3)]"
                            strokeWidth={2}
                          />
                        </div>

                        {/* Format-Specific Miniature Page Graphic */}
                        {fmt.id === 'book' && (
                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <span
                                style={{ backgroundColor: toneVar('butter') }}
                                className="inline-block h-1.5 w-7 rounded-full"
                              />
                              <div className="mt-1 h-1.5 w-3/4 rounded-full bg-[var(--ink-1)] opacity-80" />
                              <div className="mt-1.5 space-y-1">
                                <div className="h-1 w-full rounded-full bg-[var(--ink-3)] opacity-35" />
                                <div className="h-1 w-5/6 rounded-full bg-[var(--ink-3)] opacity-35" />
                                <div className="h-1 w-4/6 rounded-full bg-[var(--ink-3)] opacity-25" />
                              </div>
                            </div>
                            {/* Chapter turn ticks */}
                            <div className="flex items-center gap-1 pt-1">
                              <span className="h-1 w-4 rounded-full bg-[var(--ink-2)] opacity-50" />
                              <span className="h-1 w-4 rounded-full bg-[var(--ink-3)] opacity-25" />
                            </div>
                          </div>
                        )}

                        {fmt.id === 'screenplay' && (
                          <div className="flex flex-1 flex-col">
                            {/* Slugline bar */}
                            <div
                              style={{ backgroundColor: toneVar('lavender') }}
                              className="h-1.5 w-4/5 rounded-sm"
                            />
                            {/* Action line */}
                            <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--ink-3)] opacity-35" />
                            {/* Centered Character + Dialogue block */}
                            <div className="mt-1.5 flex flex-col items-center space-y-0.5">
                              <div className="h-1 w-6 rounded-full bg-[var(--ink-1)] opacity-75" />
                              <div className="h-1 w-3/5 rounded-full bg-[var(--ink-2)] opacity-45" />
                              <div className="h-1 w-1/2 rounded-full bg-[var(--ink-2)] opacity-35" />
                            </div>
                          </div>
                        )}

                        {fmt.id === 'essay' && (
                          <div className="flex flex-1 gap-1.5">
                            {/* Left margin outline ticks */}
                            <div className="flex flex-col gap-1 pt-0.5">
                              <span
                                style={{ backgroundColor: 'var(--signal)' }}
                                className="h-0.5 w-2 rounded-full"
                              />
                              <span className="h-0.5 w-1.5 rounded-full bg-[var(--ink-4)] opacity-60" />
                              <span className="h-0.5 w-1.5 rounded-full bg-[var(--ink-4)] opacity-40" />
                            </div>
                            {/* Continuous essay lines */}
                            <div className="flex-1">
                              <div className="h-1.5 w-4/5 rounded-full bg-[var(--ink-1)] opacity-80" />
                              <div className="mt-1.5 space-y-1">
                                <div className="h-1 w-full rounded-full bg-[var(--ink-3)] opacity-35" />
                                <div className="h-1 w-11/12 rounded-full bg-[var(--ink-3)] opacity-35" />
                                <div className="h-1 w-4/5 rounded-full bg-[var(--ink-3)] opacity-30" />
                                <div className="h-1 w-2/3 rounded-full bg-[var(--ink-3)] opacity-25" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom-left Checkmark Badge (animated contextual icon entrance) */}
                      <span
                        aria-hidden="true"
                        style={{
                          backgroundColor: 'var(--ink-1)',
                          color: 'var(--bg-canvas)',
                          opacity: active ? 1 : 0,
                          transform: active ? 'scale(1)' : 'scale(0.3)',
                          filter: active ? 'blur(0px)' : 'blur(2px)',
                          transition:
                            'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out, filter 180ms ease-out',
                        }}
                        className="pointer-events-none absolute bottom-2 left-2 flex size-4 items-center justify-center rounded-full shadow-sm motion-reduce:!transition-none"
                      >
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    </div>

                    {/* Label & Sublabel below thumbnail */}
                    <span
                      className={`mt-2 text-xs font-semibold transition-colors duration-150 ${
                        active
                          ? 'text-[var(--ink-1)]'
                          : 'text-[var(--ink-2)] group-hover:text-[var(--ink-1)]'
                      }`}
                    >
                      {fmt.name}
                    </span>
                    <span className="text-[10px] text-[var(--ink-3)]">
                      {fmt.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Session Word Goal Swatches (like Accent color circles in reference) */}
          <div
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
            className="flex flex-col gap-2.5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">
                Session word goal
              </div>
              <p className="mt-0.5 text-xs text-[var(--ink-3)]">
                Pick the target for your bottom progress ring
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Session word goal"
              className="flex items-center gap-2"
            >
              {GOAL_SWATCHES.map((swatch) => {
                const selected = wordGoal === swatch.value;
                return (
                  <button
                    key={swatch.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${swatch.value} words`}
                    onClick={() => setWordGoal(swatch.value)}
                    style={{
                      backgroundColor: toneVar(swatch.tone),
                      color: 'var(--on-pastel)',
                      boxShadow: selected
                        ? '0 0 0 1.5px var(--bg-elevated), 0 0 0 3px var(--ink-1)'
                        : 'inset 0 0 0 1px rgba(17,17,17,0.08)',
                    }}
                    className="flex size-8 items-center justify-center rounded-full font-mono text-[10px] font-semibold tracking-tight transition-[transform,box-shadow] duration-150 ease-out [font-variant-numeric:tabular-nums] hover:scale-[1.06] active:scale-[0.94]"
                  >
                    {swatch.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rows 4–6: Three Toggle Switch Rows with Hairline Dividers */}
          <div className="divide-y divide-[var(--border-subtle)]">
            {toggleRows.map((row) => {
              const RowIcon = row.icon;
              return (
                <div
                  key={row.id}
                  onClick={() => row.onChange(!row.checked)}
                  className="flex cursor-pointer items-center justify-between gap-3 py-3.5 select-none"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <RowIcon
                      className="size-4 shrink-0 text-[var(--ink-3)]"
                      strokeWidth={1.85}
                    />
                    <span className="truncate text-[13px] font-medium text-[var(--ink-1)]">
                      {row.label}
                    </span>
                    <span className="hidden rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3)] sm:inline-block">
                      {row.hint}
                    </span>
                  </div>

                  {/* Pill Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.checked}
                    aria-label={row.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      row.onChange(!row.checked);
                    }}
                    style={{
                      backgroundColor: row.checked
                        ? 'var(--ink-1)'
                        : 'var(--bg-surface)',
                      boxShadow: row.checked
                        ? 'none'
                        : 'inset 0 0 0 1px var(--border-strong)',
                    }}
                    className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-1)] focus-visible:ring-offset-2 active:scale-[0.96]"
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        backgroundColor: row.checked
                          ? toneVar(activeTone)
                          : 'var(--ink-3)',
                        transform: row.checked
                          ? 'translateX(20px)'
                          : 'translateX(0px)',
                        transition:
                          'transform 180ms cubic-bezier(0.32, 0.72, 0, 1), background-color 150ms ease-out',
                      }}
                      className="pointer-events-none size-5 rounded-full shadow-sm motion-reduce:!transition-none"
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom Footer Bar: Reset to default | Cancel | Create */}
          <div
            style={{ borderTop: '1px solid var(--border-subtle)' }}
            className="mt-1 flex items-center justify-between gap-3 pt-4"
          >
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg py-1.5 pr-2 text-xs font-medium text-[var(--ink-3)] transition-[color,transform] duration-150 ease-out hover:text-[var(--ink-1)] active:scale-[0.96]"
            >
              <RotateCcw className="size-3.5" strokeWidth={1.85} />
              <span>Reset to default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  boxShadow:
                    'inset 0 0 0 var(--border-hairline) var(--border-strong)',
                }}
                className="h-9 rounded-xl px-4 text-xs font-semibold text-[var(--ink-1)] transition-[background-color,transform] duration-150 ease-out hover:bg-[var(--bg-subtle-hover)] active:scale-[0.96]"
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--ink-1)',
                  color: 'var(--bg-canvas)',
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.96]"
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: toneVar(activeTone) }}
                  className="size-2 rounded-full transition-colors duration-150"
                />
                <span>
                  {selectedKind === 'book'
                    ? 'Create Book'
                    : selectedKind === 'screenplay'
                    ? 'Create Screenplay'
                    : 'Create Essay'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
