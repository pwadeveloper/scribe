import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { DocumentUnit, WorkKind } from '../types';
import { getUnitBadgeLabel } from '../editorUtils';
import { canHover, prefersReducedMotion } from '../motion';

export interface OutlineHeadingItem {
  id: string;
  text: string;
  sublabel?: string;
  level: 0 | 1 | 2 | 3; // 0 = Title / Primary Unit, 1 = H1, 2 = H2, 3 = H3
  element: HTMLElement | null;
  unitId?: string;
}

interface DocumentOutlineProps {
  workKind: WorkKind;
  docTitle: string;
  contentHtml: string;
  units?: DocumentUnit[];
  activeUnitId?: string;
  onSelectUnit?: (unitId: string) => void;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  sidebarOpen: boolean;
  isTyping: boolean;
}

export const DocumentOutline: React.FC<DocumentOutlineProps> = ({
  workKind,
  docTitle,
  contentHtml,
  units,
  activeUnitId,
  onSelectUnit,
  editorContainerRef,
  titleInputRef,
  sidebarOpen,
  isTyping,
}) => {
  const [headings, setHeadings] = useState<OutlineHeadingItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const navRef = useRef<HTMLElement>(null);
  const ticksWrapperRef = useRef<HTMLButtonElement>(null);
  const labelsWrapperRef = useRef<HTMLDivElement>(null);
  const labelRowsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const tickBarsRef = useRef<(HTMLSpanElement | null)[]>([]);

  const scanHeadings = useCallback(() => {
    const items: OutlineHeadingItem[] = [];

    if ((workKind === 'book' || workKind === 'screenplay') && units && units.length > 0) {
      units.forEach((u) => {
        const isCurrentUnit = u.id === activeUnitId;
        const badge = getUnitBadgeLabel(u, units);
        const labelText =
          workKind === 'screenplay'
            ? u.slugline || u.title || badge
            : u.title
            ? `${badge}: ${u.title}`
            : badge;

        items.push({
          id: `outline-unit-${u.id}`,
          text: labelText,
          sublabel: badge,
          level: 0,
          element: isCurrentUnit ? titleInputRef.current : null,
          unitId: u.id,
        });

        if (isCurrentUnit && editorContainerRef.current && workKind === 'book') {
          const nodes = editorContainerRef.current.querySelectorAll('h1, h2, h3');
          nodes.forEach((node, idx) => {
            const el = node as HTMLElement;
            const rawText = (el.textContent || '').trim();
            if (!rawText) return;
            const tag = el.tagName.toLowerCase();
            const level: 1 | 2 | 3 = tag === 'h1' ? 2 : tag === 'h2' ? 2 : 3;
            items.push({
              id: `outline-subheading-${u.id}-${idx}`,
              text: rawText,
              level,
              element: el,
              unitId: u.id,
            });
          });
        }
      });
    } else {
      items.push({
        id: 'outline-doc-title',
        text: docTitle.trim() || 'Untitled manuscript',
        level: 0,
        element: titleInputRef.current,
      });

      const editor = editorContainerRef.current;
      if (editor) {
        const nodes = editor.querySelectorAll('h1, h2, h3');
        nodes.forEach((node, idx) => {
          const el = node as HTMLElement;
          const rawText = (el.textContent || '').trim();
          if (!rawText) return;
          const tag = el.tagName.toLowerCase();
          const level: 1 | 2 | 3 = tag === 'h1' ? 1 : tag === 'h2' ? 2 : 3;
          items.push({
            id: `outline-heading-${idx}`,
            text: rawText,
            level,
            element: el,
          });
        });
      }
    }

    setHeadings(items);
  }, [workKind, units, activeUnitId, docTitle, editorContainerRef, titleInputRef]);

  useEffect(() => {
    scanHeadings();
  }, [contentHtml, docTitle, activeUnitId, units, scanHeadings]);

  // Dismiss expanded outline on touch outside
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setHoveredIndex(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [isExpanded]);

  const updateActiveFromScroll = useCallback(() => {
    if (headings.length === 0) return;

    if (workKind === 'book' || workKind === 'screenplay') {
      let baseIdx = headings.findIndex(
        (h) => h.unitId === activeUnitId && h.level === 0
      );
      if (baseIdx === -1) baseIdx = 0;

      const threshold = window.innerHeight * 0.32;
      let activeIdx = baseIdx;

      for (let i = baseIdx + 1; i < headings.length; i++) {
        const item = headings[i];
        if (item.unitId !== activeUnitId) break;
        if (item.element) {
          const rect = item.element.getBoundingClientRect();
          if (rect.top <= threshold) {
            activeIdx = i;
          }
        }
      }
      setActiveIndex(activeIdx);
      return;
    }

    if (headings.length <= 1) {
      setActiveIndex(0);
      return;
    }

    const threshold = window.innerHeight * 0.32;
    let currentIdx = 0;

    for (let i = 1; i < headings.length; i++) {
      const el = headings[i].element;
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= threshold) {
        currentIdx = i;
      } else {
        break;
      }
    }

    if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 40
    ) {
      const lastEl = headings[headings.length - 1]?.element;
      if (lastEl) {
        const rect = lastEl.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.75) {
          currentIdx = headings.length - 1;
        }
      }
    }

    setActiveIndex(currentIdx);
  }, [headings, workKind, activeUnitId]);

  useEffect(() => {
    updateActiveFromScroll();
    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveFromScroll);
  }, [updateActiveFromScroll]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const targetOpacity = sidebarOpen ? 0 : isTyping && !isExpanded ? 0.42 : 1;

    if (prefersReducedMotion()) {
      nav.style.opacity = String(targetOpacity);
      return;
    }

    gsap.to(nav, {
      opacity: targetOpacity,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [isTyping, isExpanded, sidebarOpen]);

  useEffect(() => {
    const ticksEl = ticksWrapperRef.current;
    const labelsEl = labelsWrapperRef.current;
    const rows = labelRowsRef.current.filter(Boolean) as HTMLButtonElement[];
    const ticks = tickBarsRef.current.filter(Boolean) as HTMLSpanElement[];

    if (!ticksEl || !labelsEl) return;

    if (prefersReducedMotion()) {
      ticksEl.style.opacity = isExpanded ? '0' : '1';
      ticksEl.style.pointerEvents = isExpanded ? 'none' : 'auto';
      labelsEl.style.opacity = isExpanded ? '1' : '0';
      labelsEl.style.visibility = isExpanded ? 'visible' : 'hidden';
      labelsEl.style.pointerEvents = isExpanded ? 'auto' : 'none';
      return;
    }

    if (isExpanded) {
      gsap.killTweensOf([ticksEl, labelsEl, ...rows, ...ticks]);

      gsap.to(ticksEl, {
        autoAlpha: 0,
        x: -4,
        duration: 0.14,
        ease: 'power2.out',
      });

      gsap.set(labelsEl, { pointerEvents: 'auto' });
      gsap.to(labelsEl, {
        autoAlpha: 1,
        x: 0,
        duration: 0.2,
        ease: 'power3.out',
      });

      gsap.fromTo(
        rows,
        { x: -7, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.22,
          stagger: 0.015,
          ease: 'power3.out',
          overwrite: 'auto',
        }
      );
    } else {
      gsap.killTweensOf([ticksEl, labelsEl, ...rows, ...ticks]);

      gsap.set(labelsEl, { pointerEvents: 'none' });
      gsap.to(labelsEl, {
        autoAlpha: 0,
        x: -6,
        duration: 0.15,
        ease: 'power2.in',
      });

      gsap.to(ticksEl, {
        autoAlpha: 1,
        x: 0,
        duration: 0.2,
        ease: 'power3.out',
      });

      gsap.fromTo(
        ticks,
        { scaleX: 0.6, opacity: 0.3 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.2,
          stagger: 0.012,
          ease: 'power2.out',
          overwrite: 'auto',
        }
      );
    }
  }, [isExpanded, headings.length]);

  const handleItemHoverEnter = (idx: number, btn: HTMLButtonElement) => {
    if (!canHover()) return;
    setHoveredIndex(idx);
    if (prefersReducedMotion()) return;
    gsap.to(btn, {
      x: 3.5,
      duration: 0.16,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleItemHoverLeave = (btn: HTMLButtonElement) => {
    setHoveredIndex(null);
    if (prefersReducedMotion()) return;
    gsap.to(btn, {
      x: 0,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleJumpToHeading = (item: OutlineHeadingItem, idx: number) => {
    setActiveIndex(idx);
    if (!canHover()) {
      setIsExpanded(false);
    }

    if (item.unitId && item.unitId !== activeUnitId && onSelectUnit) {
      onSelectUnit(item.unitId);
      return;
    }

    if (item.level === 0 || !item.element) {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      return;
    }

    const rect = item.element.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - window.innerHeight * 0.2;

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });

    if (!prefersReducedMotion()) {
      gsap.fromTo(
        item.element,
        { x: 4 },
        {
          x: 0,
          duration: 0.45,
          ease: 'power3.out',
          overwrite: 'auto',
        }
      );
    }
  };

  if (sidebarOpen) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Document outline"
      onMouseEnter={() => {
        if (canHover()) setIsExpanded(true);
      }}
      onMouseLeave={() => {
        if (canHover()) {
          setIsExpanded(false);
          setHoveredIndex(null);
        }
      }}
      onFocus={() => setIsExpanded(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsExpanded(false);
        }
      }}
      style={{
        zIndex: 'calc(var(--z-header) - 1)',
        left: 'max(0.375rem, env(safe-area-inset-left, 0px))',
      }}
      className="no-print fixed top-[30vh] select-none md:!left-3 lg:!left-5"
    >
      <div className="relative flex items-start">
        {/* Resting State: Minimal Horizontal Tick Marks (tappable on mobile, hoverable on desktop) */}
        <button
          ref={ticksWrapperRef}
          type="button"
          aria-label="Expand document outline"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(true)}
          className="flex min-h-11 min-w-9 flex-col justify-center gap-2.5 py-2 pr-3 text-start md:gap-3"
        >
          {headings.map((item, idx) => {
            const isActive = idx === activeIndex;
            const widthPx = isActive
              ? 18
              : item.level === 0 || item.level === 1
              ? 12
              : item.level === 2
              ? 9
              : 6;

            return (
              <span
                key={item.id}
                ref={(el) => {
                  tickBarsRef.current[idx] = el;
                }}
                style={{
                  width: `${widthPx}px`,
                  height: '2px',
                  transformOrigin: 'left center',
                  backgroundColor: isActive ? 'var(--accent)' : 'var(--ink-4)',
                  opacity: isActive ? 1 : 0.65,
                }}
                className="block rounded-full transition-[width,background-color,opacity] duration-200 ease-out"
              />
            );
          })}
        </button>

        {/* Hovered / Tapped State: Expanded Section List */}
        <div
          ref={labelsWrapperRef}
          aria-hidden={!isExpanded}
          style={{
            opacity: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 95%, transparent)',
            boxShadow: 'var(--elevation-floating)',
          }}
          className="vellum-scroller absolute left-0 top-0 -my-1.5 flex max-h-[58dvh] w-52 flex-col gap-0.5 overflow-y-auto rounded-2xl p-2.5 backdrop-blur-md md:bg-[color-mix(in_srgb,var(--bg-canvas)_92%,transparent)] md:shadow-none"
        >
          {headings.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isHovered = idx === hoveredIndex;
            const highlighted = isActive || isHovered;

            return (
              <button
                key={item.id}
                ref={(el) => {
                  labelRowsRef.current[idx] = el;
                }}
                type="button"
                title={item.text}
                onMouseEnter={(e) => handleItemHoverEnter(idx, e.currentTarget)}
                onMouseLeave={(e) => handleItemHoverLeave(e.currentTarget)}
                onClick={() => handleJumpToHeading(item, idx)}
                style={{
                  color: highlighted
                    ? 'var(--accent)'
                    : item.level === 0 || item.level === 1
                    ? 'var(--ink-2)'
                    : 'var(--ink-3)',
                  paddingInlineStart:
                    item.level === 2
                      ? '0.45rem'
                      : item.level === 3
                      ? '0.85rem'
                      : '0rem',
                }}
                className={`block w-full truncate rounded-lg py-1.5 text-start font-sans text-xs transition-colors duration-150 md:py-0.5 ${
                  item.level === 0 || item.level === 1
                    ? 'font-semibold tracking-[-0.01em]'
                    : item.level === 2
                    ? 'font-medium text-[11.5px]'
                    : 'font-normal text-[11px]'
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
