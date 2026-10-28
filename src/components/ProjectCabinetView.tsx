import React, { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import {
  BookOpen,
  Film,
  Feather,
  Plus,
  ArrowUpRight,
  Folder,
  Layers,
  Trash2,
  Pin,
} from 'lucide-react';
import { DocumentItem, WorkKind } from '../types';
import {
  computeDocumentTotalMetrics,
  extractPlainTextSnippet,
} from '../editorUtils';
import { canHover, gsapButtonHover, prefersReducedMotion } from '../motion';

interface ProjectCabinetViewProps {
  documents: DocumentItem[];
  activeDocId: string;
  onSelectDocAndWrite: (docId: string) => void;
  onSelectDocBirdsEye: (docId: string) => void;
  onOpenNewWorkModal: (defaultKind?: WorkKind) => void;
  onTogglePin: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
}

type CategoryFilter = 'all' | 'book' | 'screenplay' | 'essay';

/**
 * Renders the segmented vertical tick-bar meter inspired by Image 2: ||||||||.. 14/20
 */
export const SegmentedTickMeter: React.FC<{
  current: number;
  target: number;
  segments?: number;
}> = ({ current, target, segments = 12 }) => {
  const ratio = target > 0 ? Math.min(1, current / target) : 0;
  const filledCount = Math.max(
    current > 0 ? 1 : 0,
    Math.round(ratio * segments)
  );

  return (
    <div className="flex items-center gap-2 [font-variant-numeric:tabular-nums]">
      <div className="flex items-center gap-[2.5px]" aria-hidden="true">
        {Array.from({ length: segments }).map((_, idx) => {
          const filled = idx < filledCount;
          return (
            <span
              key={idx}
              style={{
                backgroundColor: filled
                  ? 'var(--accent)'
                  : 'var(--border-strong)',
                opacity: filled ? 1 : 0.45,
              }}
              className="inline-block h-3 w-[2.5px] rounded-full transition-colors duration-200"
            />
          );
        })}
      </div>
      <span className="font-mono text-[11px] text-[var(--ink-2)]">
        {current.toLocaleString()}{' '}
        <span className="text-[var(--ink-4)]">
          / {target.toLocaleString()}w
        </span>
      </span>
    </div>
  );
};

export const ProjectCabinetView: React.FC<ProjectCabinetViewProps> = ({
  documents,
  activeDocId,
  onSelectDocAndWrite,
  onSelectDocBirdsEye,
  onOpenNewWorkModal,
  onTogglePin,
  onDeleteDoc,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('all');
  const [inspectedDocId, setInspectedDocId] = useState<string>(activeDocId);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inspectorContentRef = useRef<HTMLDivElement>(null);
  const folderVisualRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredDocs = useMemo(() => {
    if (selectedCategory === 'all') return documents;
    return documents.filter((d) => d.kind === selectedCategory);
  }, [documents, selectedCategory]);

  // Keep inspectedDocId valid when filtering
  useEffect(() => {
    if (!filteredDocs.some((d) => d.id === inspectedDocId)) {
      if (filteredDocs[0]) {
        setInspectedDocId(filteredDocs[0].id);
      }
    }
  }, [filteredDocs, inspectedDocId]);

  const inspectedDoc = useMemo(() => {
    return (
      filteredDocs.find((d) => d.id === inspectedDocId) ||
      filteredDocs[0] ||
      documents[0]
    );
  }, [filteredDocs, inspectedDocId, documents]);

  const inspectedIndex = useMemo(() => {
    return Math.max(
      0,
      filteredDocs.findIndex((d) => d.id === inspectedDoc?.id)
    );
  }, [filteredDocs, inspectedDoc]);

  // Subtle cross-fade of ONLY the inner text inside the fixed-height Inspector Card
  // so the card frame and the folder stack below never shift or jitter
  useEffect(() => {
    const el = inspectorContentRef.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { opacity: 0.55, y: 3 },
      {
        opacity: 1,
        y: 0,
        duration: 0.16,
        ease: 'power2.out',
        overwrite: true,
      }
    );
  }, [inspectedDoc?.id]);

  // Sync visual lift of all folders whenever inspectedDoc changes
  useEffect(() => {
    if (prefersReducedMotion()) return;
    filteredDocs.forEach((doc) => {
      const visualEl = folderVisualRefs.current[doc.id];
      if (!visualEl) return;
      const isInspected = doc.id === inspectedDoc?.id;
      gsap.to(visualEl, {
        y: isInspected ? -5 : 0,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  }, [inspectedDoc?.id, filteredDocs]);

  // Entrance animation of the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.26, ease: 'power3.out' }
    );
  }, []);

  const btnHover = gsapButtonHover({
    hoverScale: 1.02,
    hoverY: -1,
    pressScale: 0.97,
  });

  const counts = useMemo(() => {
    return {
      all: documents.length,
      book: documents.filter((d) => d.kind === 'book').length,
      screenplay: documents.filter((d) => d.kind === 'screenplay').length,
      essay: documents.filter((d) => d.kind === 'essay').length,
    };
  }, [documents]);

  const handlePocketHoverEnter = (el: HTMLElement) => {
    if (prefersReducedMotion() || !canHover()) return;
    const sheets = el.querySelectorAll('[data-paper-sheet="true"]');
    gsap.to(el, { y: -3, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    if (sheets.length > 0) {
      gsap.to(sheets, {
        y: -5,
        rotation: (i) => (i === 0 ? -4 : 4),
        duration: 0.24,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handlePocketHoverLeave = (el: HTMLElement) => {
    if (prefersReducedMotion()) return;
    const sheets = el.querySelectorAll('[data-paper-sheet="true"]');
    gsap.to(el, { y: 0, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    if (sheets.length > 0) {
      gsap.to(sheets, {
        y: 0,
        rotation: (i) => (i === 0 ? -2 : 2),
        duration: 0.24,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const inspectedMetrics = inspectedDoc
    ? computeDocumentTotalMetrics(inspectedDoc)
    : null;

  const inspectedExcerpt = useMemo(() => {
    if (!inspectedDoc) return '';
    if (inspectedDoc.kind === 'essay' || !inspectedDoc.units?.length) {
      return extractPlainTextSnippet(inspectedDoc.contentHtml, 210);
    }
    const activeOrFirst =
      inspectedDoc.units.find((u) => u.id === inspectedDoc.activeUnitId) ||
      inspectedDoc.units[0];
    return extractPlainTextSnippet(activeOrFirst.contentHtml, 210);
  }, [inspectedDoc]);

  const folderGroups: {
    id: CategoryFilter;
    title: string;
    subtitle: string;
    count: number;
    kind?: WorkKind;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'book',
      title: 'Books & Novels',
      subtitle: `${counts.book} ${
        counts.book === 1 ? 'manuscript' : 'manuscripts'
      }`,
      count: counts.book,
      kind: 'book',
      icon: BookOpen,
    },
    {
      id: 'screenplay',
      title: 'Screenplays',
      subtitle: `${counts.screenplay} ${
        counts.screenplay === 1 ? 'script' : 'scripts'
      }`,
      count: counts.screenplay,
      kind: 'screenplay',
      icon: Film,
    },
    {
      id: 'essay',
      title: 'Essays & Notes',
      subtitle: `${counts.essay} ${counts.essay === 1 ? 'piece' : 'pieces'}`,
      count: counts.essay,
      kind: 'essay',
      icon: Feather,
    },
  ];

  // Staggered horizontal positions for die-cut folder tabs (like Image 3)
  const tabPositions = ['7%', '36%', '61%', '18%', '46%'];

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-5xl px-4 pb-28 pt-20 sm:px-8 sm:pt-24"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--accent)]">
            <Folder className="size-3.5" />
            <span>Manuscript Filing Cabinet &amp; Folders</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--ink-1)] sm:text-4xl">
            Project Archive
          </h1>
          <p className="mt-1 text-xs text-[var(--ink-3)]">
            Browse your folders by format or pull any file from the cabinet stack
            below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="h-9 rounded-xl bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)]"
            >
              Show All ({counts.all})
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              onOpenNewWorkModal(
                selectedCategory === 'all' ? undefined : selectedCategory
              )
            }
            {...btnHover}
            style={{
              backgroundColor: 'var(--ink-1)',
              color: 'var(--bg-canvas)',
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-medium"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            <span>New Work</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Tactile Folder Pockets (Inspired by Image 1) */}
      <div className="mb-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--ink-3)]">
            Category Folders
          </h2>
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            Click a folder to filter cabinet
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {folderGroups.map((folder) => {
            const isSelected = selectedCategory === folder.id;
            const Icon = folder.icon;
            return (
              <div
                key={folder.id}
                onMouseEnter={(e) => handlePocketHoverEnter(e.currentTarget)}
                onMouseLeave={(e) => handlePocketHoverLeave(e.currentTarget)}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === folder.id ? 'all' : folder.id
                  )
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCategory(
                      selectedCategory === folder.id ? 'all' : folder.id
                    );
                  }
                }}
                style={{
                  backgroundColor: isSelected
                    ? 'var(--bg-elevated)'
                    : 'var(--bg-surface)',
                  boxShadow: isSelected
                    ? '0 0 0 2px var(--accent), var(--elevation-raised)'
                    : 'var(--elevation-raised)',
                }}
                className="group cursor-pointer rounded-2xl p-4 text-center transition-shadow duration-150"
              >
                {/* Tactile Folder Pocket Illustration with Peeking Paper Sheets */}
                <div className="relative mx-auto mb-3 mt-2 h-28 w-44 select-none">
                  {/* Back Folder Tab */}
                  <div
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--accent)'
                        : 'var(--ink-3)',
                      opacity: isSelected ? 0.85 : 0.45,
                    }}
                    className="absolute inset-x-2 top-1 h-20 rounded-xl transition-colors"
                  />
                  <div
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--accent)'
                        : 'var(--ink-3)',
                      opacity: isSelected ? 0.85 : 0.45,
                    }}
                    className="absolute left-2 top-0 h-5 w-16 rounded-t-lg transition-colors"
                  />

                  {/* Peeking Paper Sheet 1 */}
                  <div
                    data-paper-sheet="true"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      transform: 'rotate(-2deg)',
                    }}
                    className="absolute left-5 top-2.5 h-16 w-20 rounded-md p-2 text-start"
                  >
                    <div className="mb-1 h-1 w-8 rounded-full bg-[var(--accent)] opacity-70" />
                    <div className="mb-1 h-1 w-12 rounded-full bg-[var(--ink-4)] opacity-40" />
                    <div className="h-1 w-10 rounded-full bg-[var(--ink-4)] opacity-40" />
                  </div>

                  {/* Peeking Paper Sheet 2 */}
                  <div
                    data-paper-sheet="true"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      transform: 'rotate(2deg)',
                    }}
                    className="absolute right-5 top-3 h-16 w-20 rounded-md p-2 text-start"
                  >
                    <div className="mb-1 font-mono text-[7px] font-bold uppercase text-[var(--ink-3)]">
                      {folder.id.toUpperCase()}
                    </div>
                    <div className="mb-1 h-1 w-11 rounded-full bg-[var(--ink-4)] opacity-40" />
                    <div className="h-1 w-9 rounded-full bg-[var(--ink-4)] opacity-40" />
                  </div>

                  {/* Front Pocket Body */}
                  <div
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--ink-1)'
                        : 'var(--ink-2)',
                      boxShadow: '0 6px 14px -4px rgba(0,0,0,0.22)',
                    }}
                    className="absolute inset-x-1 bottom-0 h-20 rounded-xl p-2.5 transition-colors"
                  >
                    <div className="flex h-full items-end justify-between">
                      <span
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--ink-1)',
                        }}
                        className="flex size-6 items-center justify-center rounded-full shadow-sm"
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="font-mono text-[10px] font-medium text-[var(--bg-canvas)] opacity-80">
                        0{folder.count}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-sm font-semibold text-[var(--ink-1)]">
                  {folder.title}
                </div>
                <div className="mt-0.5 text-xs text-[var(--ink-3)]">
                  {folder.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Architectural File Cabinet Stack (Inspired by Image 3) */}
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--ink-3)]">
            Interactive File Cabinet
          </span>
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            Hover or click any folder tab to inspect · Click OPEN to write
          </span>
        </div>

        {/* Top Dark Monospace Inspector Card rising out of the Cabinet (FIXED HEIGHT so zero layout shift!) */}
        {inspectedDoc && inspectedMetrics && (
          <div className="relative mx-auto w-[86%] sm:w-[78%]">
            {/* Background Cabinet Backboard Lip */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
              }}
              className="pointer-events-none absolute -inset-x-5 -bottom-6 top-6 rounded-t-xl"
            />

            <div
              style={{
                backgroundColor: '#1B1A18',
                color: '#EAE4DC',
                boxShadow: '0 16px 34px -8px rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              className="relative z-10 flex h-[228px] flex-col justify-between rounded-xl p-5 sm:h-[224px] sm:p-6"
            >
              <div
                ref={inspectorContentRef}
                className="flex h-full flex-col justify-between"
              >
                {/* Top Monospace Index Line + Excerpt */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between font-mono text-[11px] tracking-[0.06em] text-[#8F887F] [font-variant-numeric:tabular-nums]">
                    <span>
                      FILE {String(inspectedIndex + 1).padStart(3, '0')} /{' '}
                      {String(filteredDocs.length).padStart(3, '0')} ·{' '}
                      {inspectedDoc.kind.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onTogglePin(inspectedDoc.id)}
                        title={inspectedDoc.pinned ? 'Unpin' : 'Pin to top'}
                        className={`rounded p-1 transition-colors hover:bg-white/10 ${
                          inspectedDoc.pinned
                            ? 'text-[#D4845A]'
                            : 'text-[#8F887F]'
                        }`}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      {documents.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDeleteId(
                              confirmDeleteId === inspectedDoc.id
                                ? null
                                : inspectedDoc.id
                            )
                          }
                          title="Delete manuscript"
                          className="rounded p-1 text-[#8F887F] transition-colors hover:bg-white/10 hover:text-red-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fixed-Height Excerpt Box (4 lines max, never changes parent height) */}
                  <div className="h-[76px] overflow-hidden">
                    {confirmDeleteId === inspectedDoc.id ? (
                      <div className="flex h-full items-center justify-between rounded-lg bg-red-950/70 px-3.5 py-2 text-xs text-red-200">
                        <span>
                          Delete &ldquo;{inspectedDoc.title || 'Untitled'}
                          &rdquo;?
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-2 py-1 text-white/75 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDoc(inspectedDoc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded bg-red-600 px-2.5 py-1 font-medium text-white"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="line-clamp-3 font-mono text-xs leading-relaxed text-[#EAE4DC]/90 sm:text-[13px]">
                        &ldquo;{inspectedExcerpt}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Metadata + Action Buttons */}
                <div className="flex items-end justify-between gap-3 border-t border-white/10 pt-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs font-semibold uppercase tracking-[0.05em] text-white">
                      {inspectedDoc.title || 'UNTITLED MANUSCRIPT'}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.04em] text-[#8F887F] [font-variant-numeric:tabular-nums]">
                      {inspectedDoc.kind === 'book'
                        ? `${inspectedDoc.units?.length || 1} CHAPTERS`
                        : inspectedDoc.kind === 'screenplay'
                        ? `${inspectedDoc.units?.length || 1} SCENES`
                        : 'LONG-FORM ESSAY'}{' '}
                      · {inspectedMetrics.words.toLocaleString()} WORDS
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {(inspectedDoc.kind === 'book' ||
                      inspectedDoc.kind === 'screenplay') && (
                      <button
                        type="button"
                        onClick={() => onSelectDocBirdsEye(inspectedDoc.id)}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 font-mono text-[11px] font-medium text-[#EAE4DC] transition-colors hover:bg-white/15"
                      >
                        <Layers className="size-3 text-[#D4845A]" />
                        <span>TIMELINE</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectDocAndWrite(inspectedDoc.id)}
                      style={{ backgroundColor: '#EAE4DC', color: '#141312' }}
                      className="flex h-8 items-center gap-1 rounded-lg px-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] transition-transform active:scale-95"
                    >
                      <span>OPEN FILE</span>
                      <ArrowUpRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stacked Stepped Folders & Black Category Dividers (Image 3 Architecture) */}
        <div className="relative mt-3 flex flex-col items-center">
          {/* Black Die-Cut Category Divider Tabs */}
          <div className="relative z-10 mb-1 flex w-[88%] items-end justify-between px-3">
            {(
              [
                { id: 'all', label: 'A–Z ALL' },
                { id: 'book', label: 'BOOKS' },
                { id: 'screenplay', label: 'SCRIPTS' },
                { id: 'essay', label: 'ESSAYS' },
              ] as { id: CategoryFilter; label: string }[]
            ).map((divTab) => {
              const active = selectedCategory === divTab.id;
              return (
                <button
                  key={divTab.id}
                  type="button"
                  onClick={() => setSelectedCategory(divTab.id)}
                  style={{
                    backgroundColor: active ? 'var(--accent)' : '#1C1917',
                    color: '#FAF7F2',
                    clipPath: 'polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)',
                  }}
                  className="h-6 px-4 font-mono text-[10px] font-semibold tracking-[0.08em] transition-opacity hover:opacity-90"
                >
                  {divTab.label}
                </button>
              );
            })}
          </div>

          {/* Individual Stepped Manila Folder Layers */}
          {filteredDocs.map((doc, idx) => {
            const isInspected = doc.id === inspectedDoc?.id;
            const widthPercent = Math.min(98, 90 + idx * 1.35);
            const tabLeft = tabPositions[idx % tabPositions.length];
            const folderBg = isInspected
              ? 'var(--bg-elevated)'
              : 'var(--bg-surface)';
            const borderColor = isInspected
              ? 'var(--accent)'
              : 'var(--border-strong)';

            return (
              <div
                key={doc.id}
                style={{
                  width: `${widthPercent}%`,
                  zIndex: 10 + idx,
                }}
                className="pointer-events-none relative -mt-1.5 select-none"
              >
                {/* 1. STATIONARY HIT-TEST LAYER: Never moves or resizes, preventing any hover oscillation */}
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
                  <div className="pointer-events-none flex">
                    <button
                      type="button"
                      aria-label={`Inspect ${doc.title.trim() || 'Untitled'}`}
                      onMouseEnter={() => setInspectedDocId(doc.id)}
                      onFocus={() => setInspectedDocId(doc.id)}
                      onClick={() => setInspectedDocId(doc.id)}
                      onDoubleClick={() => onSelectDocAndWrite(doc.id)}
                      style={{ marginLeft: tabLeft }}
                      className="pointer-events-auto h-6 w-48 max-w-[220px] cursor-pointer rounded-t-lg bg-transparent focus:outline-none"
                    />
                  </div>
                  <div
                    onMouseEnter={() => setInspectedDocId(doc.id)}
                    onClick={() => setInspectedDocId(doc.id)}
                    onDoubleClick={() => onSelectDocAndWrite(doc.id)}
                    className="pointer-events-auto flex h-9 w-full cursor-pointer items-center justify-end px-4"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDocAndWrite(doc.id);
                      }}
                      style={{
                        opacity: isInspected ? 1 : 0,
                        pointerEvents: isInspected ? 'auto' : 'none',
                      }}
                      className="font-mono text-[10px] font-semibold text-[var(--accent)] transition-opacity duration-150 hover:underline"
                    >
                      OPEN →
                    </button>
                  </div>
                </div>

                {/* 2. PURE VISUAL LAYER (pointer-events-none): Lifts smoothly via GSAP without shifting hitboxes */}
                <div
                  ref={(el) => {
                    folderVisualRefs.current[doc.id] = el;
                  }}
                  className="pointer-events-none relative z-10"
                >
                  {/* Seamless Die-Cut Folder Tab (bottom border matches folderBg to erase seam line) */}
                  <div className="flex">
                    <div
                      style={{
                        marginLeft: tabLeft,
                        marginBottom: '-1px',
                        backgroundColor: folderBg,
                        borderTop: `1px solid ${borderColor}`,
                        borderLeft: `1px solid ${borderColor}`,
                        borderRight: `1px solid ${borderColor}`,
                        borderBottom: `1px solid ${folderBg}`,
                      }}
                      className="relative z-10 inline-flex h-6 w-48 max-w-[220px] items-center gap-1.5 rounded-t-lg px-3.5"
                    >
                      <span
                        style={{
                          backgroundColor: isInspected
                            ? 'var(--accent)'
                            : 'var(--ink-4)',
                        }}
                        className="size-1.5 shrink-0 rounded-full"
                      />
                      <span
                        style={{
                          color: isInspected
                            ? 'var(--accent)'
                            : 'var(--ink-1)',
                        }}
                        className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.06em]"
                      >
                        {doc.title.trim() || 'UNTITLED'}
                      </span>
                    </div>
                  </div>

                  {/* Folder Horizontal Ridge Sheet */}
                  <div
                    style={{
                      backgroundColor: folderBg,
                      borderTop: `1px solid ${borderColor}`,
                      borderLeft: `1px solid ${borderColor}`,
                      borderRight: `1px solid ${borderColor}`,
                    }}
                    className="flex h-9 w-full items-center justify-between rounded-t-[4px] px-4"
                  >
                    <span
                      style={{
                        opacity: isInspected ? 1 : 0.55,
                      }}
                      className="font-mono text-[10px] text-[var(--ink-3)] transition-opacity duration-150"
                    >
                      {doc.kind.toUpperCase()} ·{' '}
                      {doc.kind === 'essay'
                        ? 'SINGLE SHEET'
                        : `${doc.units?.length || 1} SECTIONS`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Cabinet Front Drawer Base Plate (Image 3 bottom block: REVIEWS / 08 FILES) */}
          <div
            style={{
              zIndex: 30 + filteredDocs.length,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--elevation-raised)',
            }}
            className="relative -mt-1 flex h-24 w-full flex-col items-center justify-center rounded-b-xl rounded-t-[3px]"
          >
            <div className="mb-1.5 h-1.5 w-14 rounded-full bg-[var(--border-strong)]" />
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-2)] [font-variant-numeric:tabular-nums]">
              {selectedCategory === 'all'
                ? 'VELLUM ARCHIVE'
                : `${selectedCategory.toUpperCase()} DRAWER`}{' '}
              / {String(filteredDocs.length).padStart(2, '0')}{' '}
              {filteredDocs.length === 1 ? 'FILE' : 'FILES'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
