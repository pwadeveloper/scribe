import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Plus,
  BookOpen,
  Film,
  ArrowLeft,
  ArrowRight,
  Trash2,
  FolderPlus,
  Sparkles,
  ChevronDown,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import {
  BookPart,
  BookSectionKind,
  DocumentItem,
  DocumentUnit,
} from '../types';
import {
  computeDocumentTotalMetrics,
  computeMetrics,
  extractPlainTextSnippet,
  getUnitBadgeLabel,
} from '../editorUtils';
import { canHover, gsapButtonHover, prefersReducedMotion } from '../motion';

interface BirdsEyeViewProps {
  doc: DocumentItem;
  activeUnitId: string;
  onSelectUnitAndWrite: (unitId: string) => void;
  onUpdateDocTitle: (title: string) => void;
  onUpdateDocSubtitle: (subtitle: string) => void;
  onAddUnit: (
    unitKind: BookSectionKind | 'scene',
    partId?: string,
    customLabel?: string
  ) => void;
  onUpdateUnitMeta: (
    unitId: string,
    patch: Partial<Pick<DocumentUnit, 'title' | 'synopsis' | 'partId' | 'customLabel' | 'slugline'>>
  ) => void;
  onMoveUnit: (unitId: string, direction: -1 | 1) => void;
  onDeleteUnit: (unitId: string) => void;
  onAddPart: (title?: string) => void;
  onRenamePart: (partId: string, title: string) => void;
  onDeletePart: (partId: string) => void;
}

export const BirdsEyeView: React.FC<BirdsEyeViewProps> = ({
  doc,
  activeUnitId,
  onSelectUnitAndWrite,
  onUpdateDocTitle,
  onUpdateDocSubtitle,
  onAddUnit,
  onUpdateUnitMeta,
  onMoveUnit,
  onDeleteUnit,
  onAddPart,
  onRenamePart,
  onDeletePart,
}) => {
  const [confirmDeleteUnitId, setConfirmDeleteUnitId] = useState<string | null>(null);
  const [matterMenuOpen, setMatterMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const matterMenuRef = useRef<HTMLDivElement>(null);

  const units = doc.units || [];
  const parts = doc.parts || [];
  const hasParts = doc.kind === 'book' && parts.length > 0;
  const totalMetrics = computeDocumentTotalMetrics(doc);

  const btnHover = gsapButtonHover({ hoverScale: 1.03, hoverY: -0.5, pressScale: 0.96 });

  // Staggered GSAP entrance when Bird's-Eye View mounts
  useEffect(() => {
    const el = containerRef.current;
    if (!el || prefersReducedMotion()) return;

    const tiles = el.querySelectorAll('[data-birdseye-tile="true"]');
    gsap.fromTo(
      el,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.24, ease: 'power3.out' }
    );
    if (tiles.length > 0) {
      gsap.fromTo(
        tiles,
        { opacity: 0, y: 12, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.26,
          stagger: 0.028,
          ease: 'power3.out',
          overwrite: 'auto',
        }
      );
    }
  }, [doc.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        matterMenuRef.current &&
        !matterMenuRef.current.contains(e.target as Node)
      ) {
        setMatterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const extractSceneCharacters = (html: string): string[] => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const set = new Set<string>();
    temp.querySelectorAll('p[data-sp-type="character"]').forEach((node) => {
      const name = (node.textContent || '')
        .replace(/\(.*?\)/g, '')
        .trim()
        .toUpperCase();
      if (name) set.add(name);
    });
    return Array.from(set).slice(0, 4);
  };

  const handleTileHoverEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion() || !canHover()) return;
    gsap.to(e.currentTarget, {
      y: -3,
      scale: 1.008,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleTileHoverLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion()) return;
    gsap.to(e.currentTarget, {
      y: 0,
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const renderTile = (unit: DocumentUnit) => {
    const globalIdx = units.findIndex((u) => u.id === unit.id);
    const isActive = unit.id === activeUnitId;
    const badge = getUnitBadgeLabel(unit, units);
    const unitMetrics = computeMetrics(unit.contentHtml);
    const snippet = extractPlainTextSnippet(unit.contentHtml, 140);
    const isConfirmingDelete = confirmDeleteUnitId === unit.id;
    const sceneChars =
      doc.kind === 'screenplay' ? extractSceneCharacters(unit.contentHtml) : [];

    return (
      <div
        key={unit.id}
        data-birdseye-tile="true"
        onMouseEnter={handleTileHoverEnter}
        onMouseLeave={handleTileHoverLeave}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: isActive
            ? '0 0 0 2px var(--accent), var(--elevation-raised)'
            : 'var(--elevation-raised)',
        }}
        className="group relative flex flex-col justify-between rounded-2xl p-4 transition-shadow duration-150"
      >
        {/* Top Row: Badge + Part Assignment + Reorder / Delete */}
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                style={{
                  backgroundColor: isActive
                    ? 'var(--accent-soft)'
                    : 'var(--bg-surface)',
                  color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                }}
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
              >
                {badge}
              </span>
              {isActive && (
                <span className="text-[11px] font-medium text-[var(--accent)]">
                  Current
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-100 transition-opacity duration-150 focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
              {hasParts && (
                <select
                  aria-label="Assign chapter to Part"
                  value={unit.partId || ''}
                  onChange={(e) =>
                    onUpdateUnitMeta(unit.id, {
                      partId: e.target.value || undefined,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                  className="mr-1 h-7 rounded-md px-1.5 text-xs text-[var(--ink-2)] focus:outline-none sm:h-6 sm:text-[11px]"
                >
                  <option value="">Unassigned</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || 'Untitled Part'}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                disabled={globalIdx === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUnit(unit.id, -1);
                }}
                aria-label="Move earlier"
                title="Move earlier"
                className="flex size-8 items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)] disabled:opacity-30 sm:size-6"
              >
                <ArrowLeft className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={globalIdx === units.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUnit(unit.id, 1);
                }}
                aria-label="Move later"
                title="Move later"
                className="flex size-8 items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)] disabled:opacity-30 sm:size-6"
              >
                <ArrowRight className="size-3.5" />
              </button>
              {units.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteUnitId(unit.id);
                  }}
                  aria-label="Delete section"
                  title="Delete section"
                  className="flex size-8 items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--bg-subtle-hover)] hover:text-red-600 sm:size-6"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Screenplay Slugline Pill */}
          {doc.kind === 'screenplay' && (
            <div className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-[0.04em] text-[var(--ink-1)]">
              {unit.slugline || 'INT. LOCATION - DAY'}
            </div>
          )}

          {/* Clickable main body to fly into this chapter/scene */}
          <button
            type="button"
            onClick={() => onSelectUnitAndWrite(unit.id)}
            className="block w-full text-start"
          >
            <h3 className="font-serif text-lg font-semibold leading-snug text-[var(--ink-1)] group-hover:text-[var(--accent)]">
              {unit.title.trim() ||
                (doc.kind === 'screenplay'
                  ? 'Untitled Scene'
                  : `Untitled ${badge}`)}
            </h3>

            {/* Live Prose / Dialogue Preview */}
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--ink-2)]">
              {snippet}
            </p>
          </button>

          {/* Character pills for Screenplay scenes */}
          {doc.kind === 'screenplay' && sceneChars.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {sceneChars.map((ch) => (
                <span
                  key={ch}
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--ink-2)]"
                >
                  {ch}
                </span>
              ))}
            </div>
          )}

          {/* Quick Synopsis / Index-card Note */}
          <div className="mt-3">
            <input
              type="text"
              value={unit.synopsis || ''}
              onChange={(e) =>
                onUpdateUnitMeta(unit.id, { synopsis: e.target.value })
              }
              onClick={(e) => e.stopPropagation()}
              placeholder={
                doc.kind === 'screenplay'
                  ? 'Scene beat / note…'
                  : 'Chapter synopsis / note…'
              }
              style={{
                backgroundColor: 'var(--bg-surface)',
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-base text-[var(--ink-2)] placeholder:text-[var(--ink-4)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] sm:text-[11px]"
            />
          </div>
        </div>

        {/* Tile Footer */}
        {!isConfirmingDelete ? (
          <div className="mt-3.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--ink-3)] [font-variant-numeric:tabular-nums]">
            <span>
              {unitMetrics.words.toLocaleString()}{' '}
              {unitMetrics.words === 1 ? 'word' : 'words'} ·{' '}
              {unitMetrics.readingTimeMinutes || 1}m
            </span>
            <button
              type="button"
              onClick={() => onSelectUnitAndWrite(unit.id)}
              className="flex items-center gap-1 font-medium text-[var(--ink-2)] transition-colors group-hover:text-[var(--accent)]"
            >
              <span>Write</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-3.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-xs">
            <button
              type="button"
              onClick={() => setConfirmDeleteUnitId(null)}
              className="rounded-md px-2 py-1 text-[var(--ink-2)] hover:bg-[var(--bg-subtle-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteUnit(unit.id);
                setConfirmDeleteUnitId(null);
              }}
              className="rounded-md bg-red-600/15 px-2.5 py-1 font-medium text-red-600 hover:bg-red-600/25"
            >
              Delete {badge}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-5xl px-6 pb-28 pt-24 sm:px-10"
    >
      {/* Top Overview Header */}
      <div className="mb-8 flex flex-col justify-between gap-6 border-b border-[var(--border-subtle)] pb-7 md:flex-row md:items-end">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.07em] text-[var(--accent)]">
            {doc.kind === 'book' ? (
              <>
                <BookOpen className="size-3.5" />
                <span>Book Bird’s-Eye View</span>
              </>
            ) : (
              <>
                <Film className="size-3.5" />
                <span>Screenplay Scene Cards</span>
              </>
            )}
          </div>

          <input
            type="text"
            value={doc.title}
            onChange={(e) => onUpdateDocTitle(e.target.value)}
            placeholder={
              doc.kind === 'book' ? 'Untitled Book' : 'UNTITLED SCREENPLAY'
            }
            className="w-full bg-transparent font-serif text-3xl font-semibold tracking-tight text-[var(--ink-1)] placeholder:text-[var(--ink-4)] focus:outline-none sm:text-4xl"
          />

          <input
            type="text"
            value={doc.subtitle || ''}
            onChange={(e) => onUpdateDocSubtitle(e.target.value)}
            placeholder={
              doc.kind === 'book'
                ? 'Add a subtitle or epigraph note…'
                : 'Written by…'
            }
            className="mt-1 w-full bg-transparent text-base text-[var(--ink-3)] placeholder:text-[var(--ink-4)] focus:outline-none sm:text-sm"
          />
        </div>

        {/* Summary Metrics & Primary Add Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="mr-1 flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs text-[var(--ink-2)] [font-variant-numeric:tabular-nums]"
          >
            <span>
              <strong className="font-semibold text-[var(--ink-1)]">
                {units.length}
              </strong>{' '}
              {doc.kind === 'book'
                ? units.length === 1
                  ? 'section'
                  : 'sections'
                : units.length === 1
                ? 'scene'
                : 'scenes'}
            </span>
            <span className="text-[var(--ink-4)]">·</span>
            <span>
              <strong className="font-semibold text-[var(--ink-1)]">
                {totalMetrics.words.toLocaleString()}
              </strong>{' '}
              words
            </span>
          </div>

          {doc.kind === 'book' ? (
            <>
              <button
                type="button"
                onClick={() =>
                  onAddUnit('chapter', parts[parts.length - 1]?.id)
                }
                {...btnHover}
                style={{
                  backgroundColor: 'var(--ink-1)',
                  color: 'var(--bg-canvas)',
                }}
                className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-medium"
              >
                <Plus className="size-3.5" strokeWidth={2} />
                New Chapter
              </button>

              {/* Front / Back Matter Dropdown (Prologue, Epilogue, Interlude) */}
              <div ref={matterMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMatterMenuOpen((v) => !v)}
                  {...btnHover}
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--elevation-raised)',
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-[var(--ink-1)]"
                >
                  <Sparkles className="size-3.5 text-[var(--accent)]" />
                  <span>Prologue / Epilogue</span>
                  <ChevronDown className="size-3 text-[var(--ink-3)]" />
                </button>

                {matterMenuOpen && (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      boxShadow: 'var(--elevation-floating)',
                    }}
                    className="absolute right-0 top-11 z-30 w-48 rounded-xl p-1.5 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onAddUnit('prologue', parts[0]?.id, 'Prologue');
                        setMatterMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle-hover)]"
                    >
                      <span>Add Prologue</span>
                      <span className="text-[10px] text-[var(--ink-3)]">Front</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddUnit(
                          'epilogue',
                          parts[parts.length - 1]?.id,
                          'Epilogue'
                        );
                        setMatterMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle-hover)]"
                    >
                      <span>Add Epilogue</span>
                      <span className="text-[10px] text-[var(--ink-3)]">Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddUnit(
                          'interlude',
                          parts[parts.length - 1]?.id,
                          'Interlude'
                        );
                        setMatterMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle-hover)]"
                    >
                      <span>Add Interlude</span>
                      <span className="text-[10px] text-[var(--ink-3)]">Mid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddUnit('matter', parts[0]?.id, 'Foreword');
                        setMatterMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle-hover)]"
                    >
                      <span>Add Foreword / Note</span>
                      <span className="text-[10px] text-[var(--ink-3)]">Custom</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onAddPart()}
                {...btnHover}
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  boxShadow: 'var(--elevation-raised)',
                }}
                title="Parts are optional — group chapters into Part I, Part II, etc."
                className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)]"
              >
                <FolderPlus className="size-3.5" />
                <span>{hasParts ? 'New Part' : 'Add Parts (Optional)'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onAddUnit('scene')}
              {...btnHover}
              style={{
                backgroundColor: 'var(--ink-1)',
                color: 'var(--bg-canvas)',
              }}
              className="flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-medium"
            >
              <Plus className="size-3.5" strokeWidth={2} />
              New Scene
            </button>
          )}
        </div>
      </div>

      {/* Book with Optional Parts Grouping vs Flat Grid */}
      {hasParts ? (
        <div className="space-y-10">
          {parts.map((part: BookPart) => {
            const partUnits = units.filter((u) => u.partId === part.id);
            return (
              <section key={part.id} className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
                  <div className="flex flex-1 items-center gap-2">
                    <Layers className="size-4 text-[var(--accent)]" />
                    <input
                      type="text"
                      value={part.title}
                      onChange={(e) => onRenamePart(part.id, e.target.value)}
                      placeholder="Part Title (e.g., Part I: The Departure)"
                      className="w-full max-w-md bg-transparent font-serif text-xl font-semibold text-[var(--ink-1)] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAddUnit('chapter', part.id)}
                      className="flex items-center gap-1 rounded-lg bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
                    >
                      <Plus className="size-3" />
                      Add Chapter in Part
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePart(part.id)}
                      title="Remove Part divider (keeps its chapters)"
                      className="rounded-lg px-2 py-1 text-xs text-[var(--ink-3)] hover:bg-[var(--bg-subtle-hover)] hover:text-red-600"
                    >
                      Remove Part
                    </button>
                  </div>
                </div>

                {partUnits.length === 0 ? (
                  <div
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                    className="flex items-center justify-between rounded-xl px-4 py-5 text-xs text-[var(--ink-3)]"
                  >
                    <span>No chapters assigned to this Part yet.</span>
                    <button
                      type="button"
                      onClick={() => onAddUnit('chapter', part.id)}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      + Create chapter here
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {partUnits.map(renderTile)}
                  </div>
                )}
              </section>
            );
          })}

          {/* Unassigned chapters if any exist while Parts are enabled */}
          {units.some((u) => !u.partId) && (
            <section className="space-y-4">
              <div className="border-b border-[var(--border-subtle)] pb-2 font-serif text-lg font-medium text-[var(--ink-2)]">
                Unassigned Sections
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {units.filter((u) => !u.partId).map(renderTile)}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map(renderTile)}
        </div>
      )}
    </div>
  );
};

