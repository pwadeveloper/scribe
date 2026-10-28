import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Plus,
  Search,
  Pin,
  Copy,
  Trash2,
  X,
  FileText,
  BookOpen,
  Film,
  Feather,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { computeDocumentTotalMetrics } from '../editorUtils';
import { gsapButtonHover, gsapRowHover, prefersReducedMotion } from '../motion';

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onOpenNewWorkModal: () => void;
  onTogglePin: (id: string) => void;
  onDuplicateDoc: (id: string) => void;
  onDeleteDoc: (id: string) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  open,
  onClose,
  documents,
  activeDocId,
  onSelectDoc,
  onOpenNewWorkModal,
  onTogglePin,
  onDuplicateDoc,
  onDeleteDoc,
}) => {
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState(open);

  const asideRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
    }
  }, [open]);

  useEffect(() => {
    if (!shouldRender) return;
    const aside = asideRef.current;
    const backdrop = backdropRef.current;
    if (!aside || !backdrop) return;

    if (prefersReducedMotion()) {
      if (!open) setShouldRender(false);
      return;
    }

    if (open) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power3.out' }
      );
      gsap.fromTo(
        aside,
        { x: -24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.24, ease: 'power3.out' }
      );

      if (listRef.current) {
        const cards = listRef.current.querySelectorAll('[data-doc-card="true"]');
        if (cards.length > 0) {
          gsap.fromTo(
            cards,
            { x: -10, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.22,
              stagger: 0.02,
              ease: 'power3.out',
              overwrite: 'auto',
            }
          );
        }
      }
    } else {
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
      });
      gsap.to(aside, {
        x: -18,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
        onComplete: () => setShouldRender(false),
      });
    }
  }, [open, shouldRender]);

  if (!shouldRender) return null;

  const btnHover = gsapButtonHover({ hoverScale: 1.03, hoverY: -0.5, pressScale: 0.96 });
  const rowHover = gsapRowHover(2);

  const filtered = documents.filter((d) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.kind.toLowerCase().includes(q) ||
      d.contentHtml.toLowerCase().includes(q)
    );
  });

  const pinnedDocs = filtered.filter((d) => d.pinned);
  const regularDocs = filtered.filter((d) => !d.pinned);

  const renderDocRow = (doc: DocumentItem) => {
    const isActive = doc.id === activeDocId;
    const metrics = computeDocumentTotalMetrics(doc);
    const isConfirmingDelete = confirmDeleteId === doc.id;
    const KindIcon =
      doc.kind === 'book'
        ? BookOpen
        : doc.kind === 'screenplay'
        ? Film
        : Feather;

    const unitCountLabel =
      doc.kind === 'book'
        ? `${doc.units?.length || 1} ch`
        : doc.kind === 'screenplay'
        ? `${doc.units?.length || 1} sc`
        : 'Essay';

    return (
      <div
        key={doc.id}
        data-doc-card="true"
        {...rowHover}
        style={{
          backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
          boxShadow: isActive ? 'var(--elevation-raised)' : 'none',
        }}
        className="group relative rounded-xl p-2.5 transition-[background-color,box-shadow] duration-150 ease-out hover:bg-[var(--bg-subtle-hover)]"
      >
        <button
          type="button"
          onClick={() => {
            onSelectDoc(doc.id);
            setConfirmDeleteId(null);
          }}
          className="block w-full text-start"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <KindIcon
                className="size-3.5 shrink-0 text-[var(--accent)]"
                strokeWidth={1.85}
              />
              <span
                className="truncate text-sm font-medium"
                style={{ color: isActive ? 'var(--ink-1)' : 'var(--ink-2)' }}
              >
                {doc.title.trim() || 'Untitled manuscript'}
              </span>
            </div>
            {doc.pinned && (
              <Pin
                className="size-3 shrink-0 text-[var(--accent)]"
                strokeWidth={2}
              />
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ink-3)] [font-variant-numeric:tabular-nums]">
            <span className="capitalize">{unitCountLabel}</span>
            <span>·</span>
            <span>
              {metrics.words.toLocaleString()}{' '}
              {metrics.words === 1 ? 'word' : 'words'}
            </span>
          </div>
        </button>

        {/* Quick actions row: always visible on touch, hover-revealed on desktop mouse */}
        {!isConfirmingDelete ? (
          <div className="mt-2 flex items-center justify-between opacity-100 transition-opacity duration-150 focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(doc.id);
                }}
                {...btnHover}
                aria-label={doc.pinned ? 'Unpin manuscript' : 'Pin manuscript'}
                title={doc.pinned ? 'Unpin' : 'Pin to top'}
                className="flex size-8 items-center justify-center rounded-md text-[var(--ink-3)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)] sm:size-6"
              >
                <Pin className="size-3.5 sm:size-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateDoc(doc.id);
                }}
                {...btnHover}
                aria-label="Duplicate manuscript"
                title="Duplicate"
                className="flex size-8 items-center justify-center rounded-md text-[var(--ink-3)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)] sm:size-6"
              >
                <Copy className="size-3.5 sm:size-3" />
              </button>
            </div>

            {documents.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(doc.id);
                }}
                {...btnHover}
                aria-label="Delete manuscript"
                title="Delete manuscript"
                className="flex size-8 items-center justify-center rounded-md text-[var(--ink-3)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-red-600 sm:size-6"
              >
                <Trash2 className="size-3.5 sm:size-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-xs">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-md px-2 py-1 text-[var(--ink-2)] hover:bg-[var(--bg-subtle-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteDoc(doc.id);
                setConfirmDeleteId(null);
              }}
              className="rounded-md bg-red-600/15 px-2.5 py-1 font-medium text-red-600 hover:bg-red-600/25"
            >
              Delete work
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{ zIndex: 'calc(var(--z-sidebar) - 1)' }}
        className="no-print fixed inset-0 bg-black/20 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
      />

      <aside
        ref={asideRef}
        aria-label="Manuscript library"
        style={{
          zIndex: 'var(--z-sidebar)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--elevation-floating)',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',
          paddingRight: '1rem',
        }}
        className="no-print fixed inset-y-0 left-0 flex w-[min(18rem,calc(100vw-2.5rem))] flex-col"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-base font-semibold tracking-tight text-[var(--ink-1)]">
              Vellum
            </span>
            <span className="rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--ink-3)] [font-variant-numeric:tabular-nums]">
              {documents.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewWorkModal();
              }}
              {...btnHover}
              style={{
                backgroundColor: 'var(--ink-1)',
                color: 'var(--bg-canvas)',
              }}
              className="flex h-7 items-center gap-1 rounded-lg pl-2.5 pr-2 text-xs font-medium"
            >
              <Plus className="size-3.5" strokeWidth={2} />
              New work
            </button>
            <button
              type="button"
              onClick={onClose}
              {...btnHover}
              aria-label="Close manuscripts drawer"
              className="flex size-7 items-center justify-center rounded-lg text-[var(--ink-3)] hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <label htmlFor="manuscript-search" className="sr-only">
            Filter manuscripts
          </label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            id="manuscript-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter books, scripts, essays…"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              boxShadow: 'inset 0 0 0 var(--border-hairline) var(--border-subtle)',
            }}
            className="h-8 w-full rounded-lg pl-8 pr-7 text-base text-[var(--ink-1)] placeholder:text-[var(--ink-4)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-3)] sm:text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Document List */}
        <div
          ref={listRef}
          className="vellum-scroller flex-1 space-y-4 overflow-y-auto pr-1"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl py-10 text-center">
              <FileText className="mb-2 size-6 text-[var(--ink-4)]" strokeWidth={1.5} />
              <p className="text-xs font-medium text-[var(--ink-2)]">
                No matching works
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">
                Start a new book, screenplay, or essay.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onClose();
                  onOpenNewWorkModal();
                }}
                {...btnHover}
                className="mt-3 rounded-lg bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--ink-1)]"
                style={{ boxShadow: 'var(--elevation-raised)' }}
              >
                Create new work
              </button>
            </div>
          ) : (
            <>
              {pinnedDocs.length > 0 && (
                <div>
                  <div className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                    Pinned Works
                  </div>
                  <div className="space-y-1">{pinnedDocs.map(renderDocRow)}</div>
                </div>
              )}

              {regularDocs.length > 0 && (
                <div>
                  {pinnedDocs.length > 0 && (
                    <div className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                      Library
                    </div>
                  )}
                  <div className="space-y-1">{regularDocs.map(renderDocRow)}</div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};
