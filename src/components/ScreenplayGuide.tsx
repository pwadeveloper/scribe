import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Search, X, Columns2 } from 'lucide-react';
import {
  SCREENPLAY_BLOCKS,
  SCREENPLAY_VOCAB,
  SCREENPLAY_KEY_GROUPS,
  ScreenplayBlockSpec,
  ScreenplayBlockType,
  ScreenplayVocabItem,
  modKeys,
} from '../screenplay';
import { prefersReducedMotion } from '../motion';

type GuideTab = 'elements' | 'keys' | string;

interface GuideEntry {
  key: string;
  section: string;
  title: string;
  detail: string;
  shortcut?: string;
  mono: boolean;
  run: () => void;
  active?: boolean;
}

interface ScreenplayGuideProps {
  open: boolean;
  activeBlock: ScreenplayBlockType;
  onClose: () => void;
  onApplyBlock: (block: ScreenplayBlockType) => void;
  onInsertVocab: (item: ScreenplayVocabItem) => void;
  onToggleDual: () => void;
}

const TIER_LABEL: Record<ScreenplayBlockSpec['tier'], string> = {
  core: 'Core',
  common: 'Common',
  advanced: 'Advanced',
};

/**
 * Screenplay elements guide: a non-modal panel under the top bar that lists
 * every element, standard value, and shortcut. Clicking a row (or pressing
 * Enter on it) inserts it at the writer's last caret position.
 */
export const ScreenplayGuide: React.FC<ScreenplayGuideProps> = ({
  open,
  activeBlock,
  onClose,
  onApplyBlock,
  onInsertVocab,
  onToggleDual,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<GuideTab>('elements');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const { mod, alt } = modKeys();

  const tabs = useMemo(
    () => [
      { id: 'elements', label: 'Elements' },
      ...SCREENPLAY_VOCAB.map((g) => ({ id: g.id, label: g.tab })),
      { id: 'keys', label: 'Shortcuts' },
    ],
    []
  );

  const allEntries = useMemo<GuideEntry[]>(() => {
    const blocks: GuideEntry[] = SCREENPLAY_BLOCKS.map((b) => ({
      key: `block-${b.id}`,
      section: `Elements · ${TIER_LABEL[b.tier]}`,
      title: b.label,
      detail: b.description,
      shortcut: b.digit !== undefined ? `${mod}${alt}${b.digit}` : b.fountain,
      mono: false,
      run: () => onApplyBlock(b.id),
      active: activeBlock === b.id,
    }));
    blocks.push({
      key: 'dual-dialogue',
      section: `Elements · ${TIER_LABEL.common}`,
      title: 'Dual dialogue',
      detail:
        'Two characters speaking at once, set side by side. Put your cursor in the second speaker’s cue or lines.',
      shortcut: `${mod}${alt}D`,
      mono: false,
      run: onToggleDual,
    });
    const vocab: GuideEntry[] = SCREENPLAY_VOCAB.flatMap((g) =>
      g.items.map((item) => ({
        key: `${g.id}-${item.value}`,
        section: g.title,
        title: item.value,
        detail: item.meaning,
        mono: true,
        run: () => onInsertVocab(item),
      }))
    );
    return [...blocks, ...vocab];
  }, [activeBlock, onApplyBlock, onInsertVocab, onToggleDual, mod, alt]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleEntries = useMemo(() => {
    if (normalizedQuery) {
      return allEntries.filter((e) =>
        `${e.title} ${e.detail} ${e.section}`
          .toLowerCase()
          .includes(normalizedQuery)
      );
    }
    if (tab === 'elements') {
      return allEntries.filter((e) => e.section.startsWith('Elements'));
    }
    if (tab === 'keys') return [];
    const group = SCREENPLAY_VOCAB.find((g) => g.id === tab);
    return group ? allEntries.filter((e) => e.section === group.title) : [];
  }, [allEntries, normalizedQuery, tab]);

  const activeGroup = SCREENPLAY_VOCAB.find((g) => g.id === tab);
  const showKeys = !normalizedQuery && tab === 'keys';

  useEffect(() => {
    setHighlight(0);
  }, [tab, normalizedQuery]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    searchRef.current?.focus({ preventScroll: true });
    const el = panelRef.current;
    if (el && !prefersReducedMotion()) {
      gsap.fromTo(
        el,
        { opacity: 0, y: -6, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power3.out' }
      );
    }
  }, [open]);

  // Keep the highlighted row in view while arrowing through results
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-guide-index="${highlight}"]`
    );
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  if (!open) return null;

  const runEntry = (entry: GuideEntry) => {
    entry.run();
    // On small screens the panel covers the page; get out of the way
    if (window.innerWidth < 640) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (showKeys || visibleEntries.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % visibleEntries.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(
        (h) => (h - 1 + visibleEntries.length) % visibleEntries.length
      );
    } else if (e.key === 'Enter' && e.target === searchRef.current) {
      e.preventDefault();
      const entry = visibleEntries[highlight];
      if (entry) runEntry(entry);
    }
  };

  let lastSection = '';

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="screenplay-guide-title"
      onKeyDown={handleKeyDown}
      style={{
        zIndex: 'var(--z-toolbar)',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--elevation-floating)',
      }}
      className="no-print fixed right-3 top-[60px] flex max-h-[calc(100dvh-76px)] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl font-sans"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div>
          <h2
            id="screenplay-guide-title"
            className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink-1)]"
          >
            Screenplay guide
          </h2>
          <p className="mt-0.5 text-xs text-[var(--ink-3)]">
            Click anything to insert it at your cursor.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close screenplay guide"
          className="relative -mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--ink-3)] transition-[color,background-color] duration-150 ease-out before:absolute before:-inset-1 hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4">
        <label className="relative block">
          <span className="sr-only">Search screenplay elements</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-3)]"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search elements, transitions, shots…"
            role="combobox"
            aria-expanded="true"
            aria-controls="screenplay-guide-list"
            aria-activedescendant={
              visibleEntries[highlight] ? `guide-row-${highlight}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="h-9 w-full rounded-full pl-8 pr-3 text-base text-[var(--ink-1)] placeholder:text-[var(--ink-4)] focus:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--border-strong)] sm:text-[13px]"
          />
        </label>
      </div>

      {/* Tabs */}
      {!normalizedQuery && (
        <div
          role="tablist"
          aria-label="Guide sections"
          className="vellum-scroller mt-3 flex shrink-0 gap-1 overflow-x-auto px-4 pb-1"
        >
          {tabs.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                style={{
                  backgroundColor: selected ? 'var(--ink-1)' : 'transparent',
                  color: selected ? 'var(--bg-canvas)' : 'var(--ink-2)',
                }}
                className="h-7 shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-[color,background-color] duration-150 ease-out hover:bg-[var(--bg-subtle-hover)]"
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div
        ref={listRef}
        id="screenplay-guide-list"
        role={showKeys ? undefined : 'listbox'}
        aria-label={showKeys ? undefined : 'Screenplay elements'}
        className="vellum-scroller mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3"
      >
        {activeGroup && !normalizedQuery && (
          <p className="px-2 pb-2 pt-1 text-xs leading-relaxed text-[var(--ink-3)]">
            {activeGroup.hint}
          </p>
        )}

        {showKeys ? (
          <div className="space-y-4 px-2 pt-1">
            {SCREENPLAY_KEY_GROUPS(mod, alt).map((group) => (
              <section key={group.title}>
                <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                  {group.title}
                </h3>
                <div
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                  className="divide-y divide-[var(--border-subtle)] rounded-xl px-3"
                >
                  {group.rows.map((row) => (
                    <div
                      key={`${row.keys}-${row.result}`}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <span className="text-[var(--ink-2)]">{row.result}</span>
                      <kbd
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          boxShadow: 'var(--elevation-raised)',
                        }}
                        className="shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-1)]"
                      >
                        {row.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-sm font-medium text-[var(--ink-1)]">
              Nothing matches “{query.trim()}”
            </p>
            <p className="mt-1 text-xs text-[var(--ink-3)]">
              Try a term like “V.O.”, “montage”, or “cut to”.
            </p>
          </div>
        ) : (
          visibleEntries.map((entry, idx) => {
            const showSection =
              (normalizedQuery || tab === 'elements') &&
              entry.section !== lastSection;
            lastSection = entry.section;
            const isHighlighted = idx === highlight;
            return (
              <React.Fragment key={entry.key}>
                {showSection && (
                  <div className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)] first:pt-1">
                    {entry.section}
                  </div>
                )}
                <button
                  type="button"
                  id={`guide-row-${idx}`}
                  data-guide-index={idx}
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseMove={() => setHighlight(idx)}
                  onClick={() => runEntry(entry)}
                  style={{
                    backgroundColor: isHighlighted
                      ? 'var(--bg-subtle-hover)'
                      : 'transparent',
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-xl px-2 py-2 text-start transition-colors duration-100"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`text-[13px] font-medium text-[var(--ink-1)] ${
                          entry.mono ? 'font-mono tracking-[-0.01em]' : ''
                        }`}
                      >
                        {entry.title}
                      </span>
                      {entry.key === 'dual-dialogue' && (
                        <Columns2
                          aria-hidden="true"
                          className="size-3.5 text-[var(--ink-3)]"
                        />
                      )}
                      {entry.active && (
                        <span className="inline-flex h-4 items-center rounded-full bg-[var(--ink-1)] px-1.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--bg-canvas)]">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-[var(--ink-3)]">
                      {entry.detail}
                    </span>
                  </span>
                  {entry.shortcut && (
                    <kbd
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                      className="mt-0.5 shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-2)]"
                    >
                      {entry.shortcut}
                    </kbd>
                  )}
                </button>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--ink-3)]">
        <span>↑↓ to browse · ↵ to insert · Esc to close</span>
        <span className="font-mono">{mod}?</span>
      </div>
    </div>
  );
};
