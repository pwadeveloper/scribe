import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { BookOpen, Film, Feather, X, Check } from 'lucide-react';
import { WorkKind } from '../types';
import { canHover, gsapButtonHover, prefersReducedMotion } from '../motion';
import { WORK_KIND_TONE, toneChip, toneVar } from '../palette';

interface NewWorkModalProps {
  open: boolean;
  defaultKind?: WorkKind;
  onClose: () => void;
  onCreateWork: (
    kind: WorkKind,
    title: string,
    options?: { includeParts?: boolean }
  ) => void;
}

export const NewWorkModal: React.FC<NewWorkModalProps> = ({
  open,
  defaultKind,
  onClose,
  onCreateWork,
}) => {
  const [selectedKind, setSelectedKind] = useState<WorkKind>(
    defaultKind || 'book'
  );
  const [title, setTitle] = useState('');
  const [includeParts, setIncludeParts] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (defaultKind) {
      setSelectedKind(defaultKind);
    }
    setTitle('');
    // Only auto-focus input on desktop fine pointers so mobile keyboard doesn't pop open immediately
    const timer = window.setTimeout(() => {
      if (canHover()) {
        inputRef.current?.focus();
      }
    }, 60);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || prefersReducedMotion()) return;
    if (backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power3.out' }
      );
    }
    if (dialogRef.current) {
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0, scale: 0.96, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.24, ease: 'power3.out' }
      );
    }
  }, [open]);

  if (!open) return null;

  const btnHover = gsapButtonHover({ hoverScale: 1.02, hoverY: -1, pressScale: 0.97 });

  const formats: {
    id: WorkKind;
    name: string;
    tagline: string;
    description: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  }[] = [
    {
      id: 'book',
      name: 'Book / Novel',
      tagline: 'Chapters, optional Parts & Prologue/Epilogue',
      description:
        'Focus on one chapter at a time with a Bird’s-Eye tile view to fly across your manuscript.',
      icon: BookOpen,
    },
    {
      id: 'screenplay',
      name: 'Screenplay',
      tagline: 'Scene-by-Scene with Dialogue & Autocomplete',
      description:
        'Write one scene after another with INT./EXT. slugline autocomplete, character cues, and scene cards.',
      icon: Film,
    },
    {
      id: 'essay',
      name: 'Essay / Prose',
      tagline: 'Continuous Long-Form Canvas',
      description:
        'A distraction-free single sheet for essays, articles, and notes with margin heading scan.',
      icon: Feather,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateWork(selectedKind, title, { includeParts });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-work-dialog-title"
      style={{ zIndex: 'var(--z-modal)' }}
      className="no-print fixed inset-0 flex items-center justify-center p-4"
    >
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px]"
      />

      <div
        ref={dialogRef}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--elevation-floating)',
        }}
        className="vellum-scroller relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl p-5 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <span
              style={toneChip(WORK_KIND_TONE[selectedKind])}
              className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors duration-150"
            >
              New Manuscript
            </span>
            <h2
              id="new-work-dialog-title"
              className="mt-0.5 font-serif text-xl font-semibold text-[var(--ink-1)] sm:text-2xl"
            >
              What do you want to write?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="relative flex size-9 items-center justify-center rounded-lg text-[var(--ink-3)] transition-colors before:absolute before:-inset-1 hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Format Cards */}
          <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {formats.map((fmt) => {
              const Icon = fmt.icon;
              const active = selectedKind === fmt.id;
              const tone = WORK_KIND_TONE[fmt.id];
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedKind(fmt.id)}
                  {...btnHover}
                  style={{
                    backgroundColor: active
                      ? `color-mix(in srgb, ${toneVar(tone)} 55%, var(--bg-elevated))`
                      : 'var(--bg-surface)',
                    boxShadow: active
                      ? '0 0 0 2px var(--ink-1), var(--elevation-raised)'
                      : 'inset 0 0 0 var(--border-hairline) var(--border-subtle)',
                  }}
                  className="flex flex-col items-start rounded-xl p-3.5 text-start transition-shadow duration-150"
                >
                  <div className="mb-2 flex w-full items-center justify-between">
                    <span
                      style={toneChip(tone)}
                      className="flex size-8 items-center justify-center rounded-full"
                    >
                      <Icon className="size-4" strokeWidth={1.85} />
                    </span>
                    {active && (
                      <span
                        style={{
                          backgroundColor: 'var(--ink-1)',
                          color: 'var(--bg-canvas)',
                        }}
                        className="flex size-4 items-center justify-center rounded-full"
                      >
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[var(--ink-1)]">
                    {fmt.name}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] font-medium ${
                      active ? 'text-[var(--on-pastel)]' : 'text-[var(--ink-2)]'
                    }`}
                  >
                    {fmt.tagline}
                  </div>
                  <p
                    className={`mt-1.5 text-[11px] leading-relaxed ${
                      active ? 'text-[var(--ink-2)]' : 'text-[var(--ink-3)]'
                    }`}
                  >
                    {fmt.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label
              htmlFor="new-work-title"
              className="mb-1.5 block text-xs font-medium text-[var(--ink-2)]"
            >
              {selectedKind === 'book'
                ? 'Book Title'
                : selectedKind === 'screenplay'
                ? 'Screenplay Title'
                : 'Essay Title'}
            </label>
            <input
              ref={inputRef}
              id="new-work-title"
              type="text"
              enterKeyHint="done"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                selectedKind === 'book'
                  ? 'e.g., The Cartographer of Tides'
                  : selectedKind === 'screenplay'
                  ? 'e.g., NIGHT FREQUENCY'
                  : 'e.g., Notes on Architecture and Silence'
              }
              style={{
                backgroundColor: 'var(--bg-surface)',
                boxShadow:
                  'inset 0 0 0 var(--border-hairline) var(--border-strong)',
              }}
              className="h-10 w-full rounded-xl px-3.5 text-base text-[var(--ink-1)] placeholder:text-[var(--ink-4)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:text-sm"
            />
          </div>

          {/* Book-specific Option: Optional Parts */}
          {selectedKind === 'book' && (
            <label
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="mb-5 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs"
            >
              <div>
                <div className="font-medium text-[var(--ink-1)]">
                  Divide book into Parts (Part I, Part II…)
                </div>
                <div className="text-[11px] text-[var(--ink-3)]">
                  Optional — you can also write purely in Chapters and add Parts later.
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeParts}
                onChange={(e) => setIncludeParts(e.target.checked)}
                className="size-4 shrink-0 accent-[var(--accent)]"
              />
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl px-4 text-xs font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)] sm:h-9"
            >
              Cancel
            </button>
            <button
              type="submit"
              {...btnHover}
              style={{
                backgroundColor: 'var(--ink-1)',
                color: 'var(--bg-canvas)',
              }}
              className="h-10 rounded-xl px-5 text-xs font-medium sm:h-9"
            >
              {selectedKind === 'book'
                ? 'Start Book'
                : selectedKind === 'screenplay'
                ? 'Start Screenplay'
                : 'Start Essay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
