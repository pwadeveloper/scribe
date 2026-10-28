import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Clapperboard,
  AlignLeft,
  User,
  MessageSquare,
  CornerDownRight,
  ArrowRightLeft,
} from 'lucide-react';
import { gsapButtonHover, prefersReducedMotion } from '../motion';

export type ScreenplayBlockType =
  | 'slugline'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition';

export interface AutocompleteSuggestion {
  id: string;
  label: string;
  insertText: string;
  category: string;
  targetBlockType?: ScreenplayBlockType;
}

const SLUGLINE_PREFIXES = [
  { label: 'INT. ', desc: 'Interior scene' },
  { label: 'EXT. ', desc: 'Exterior scene' },
  { label: 'INT./EXT. ', desc: 'Interior & Exterior' },
  { label: 'I/E. ', desc: 'Short Interior/Exterior' },
];

const TIMES_OF_DAY = [
  { label: 'DAY', desc: 'Daytime scene' },
  { label: 'NIGHT', desc: 'Nighttime scene' },
  { label: 'CONTINUOUS', desc: 'Action continues uninterrupted' },
  { label: 'LATER', desc: 'Later in the same location' },
  { label: 'MOMENTS LATER', desc: 'Shortly after' },
  { label: 'DAWN', desc: 'Early morning light' },
  { label: 'DUSK', desc: 'Sunset / twilight' },
  { label: 'SAME TIME', desc: 'Simultaneous action' },
];

const CHARACTER_EXTENSIONS = [
  { label: '(V.O.)', desc: 'Voice Over' },
  { label: '(O.S.)', desc: 'Off Screen' },
  { label: "(CONT'D)", desc: 'Continued dialogue' },
  { label: '(INTO PHONE)', desc: 'Speaking into phone' },
  { label: '(SUBTITLED)', desc: 'Subtitled speech' },
];

const TRANSITIONS = [
  { label: 'CUT TO:', desc: 'Standard cut' },
  { label: 'DISSOLVE TO:', desc: 'Gradual dissolve' },
  { label: 'SMASH CUT TO:', desc: 'Abrupt contrast cut' },
  { label: 'MATCH CUT TO:', desc: 'Visual/audio match cut' },
  { label: 'FADE IN:', desc: 'Opening fade in' },
  { label: 'FADE OUT.', desc: 'Scene or act end' },
];

export function computeScreenplaySuggestions(params: {
  blockType: ScreenplayBlockType;
  lineText: string;
  knownCharacters: string[];
  knownLocations: string[];
}): AutocompleteSuggestion[] {
  const { blockType, lineText, knownCharacters, knownLocations } = params;
  const trimmed = lineText.trimStart();
  const upper = trimmed.toUpperCase();

  // 1. If in a slugline OR typing INT / EXT at the start of any line
  if (
    blockType === 'slugline' ||
    /^(I|IN|INT|E|EX|EXT|I\/E)\b/i.test(trimmed)
  ) {
    // Check if user already has INT. / EXT. and is typing time of day after " - "
    const dashIndex = upper.lastIndexOf(' -');
    if (dashIndex !== -1 && /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/.test(upper)) {
      const beforeDash = upper.slice(0, dashIndex).trim();
      const afterDash = upper.slice(dashIndex + 2).trim();
      return TIMES_OF_DAY.filter(
        (t) => !afterDash || t.label.startsWith(afterDash) && t.label !== afterDash
      ).map((t) => ({
        id: `tod-${t.label}`,
        label: `${beforeDash} - ${t.label}`,
        insertText: `${beforeDash} - ${t.label}`,
        category: t.desc,
        targetBlockType: 'slugline',
      }));
    }

    // Check if user has typed "INT. " or "EXT. " and is typing a location
    const prefixMatch = upper.match(/^(INT\.\/EXT\.|INT\.|EXT\.|I\/E\.)\s*(.*)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const locQuery = prefixMatch[2].trim();

      // Extract bare locations from known full sluglines
      const bareLocations = Array.from(
        new Set(
          knownLocations
            .map((s) =>
              s
                .replace(/^(INT\.\/EXT\.|INT\.|EXT\.|I\/E\.)\s*/i, '')
                .replace(/\s*-\s*(DAY|NIGHT|CONTINUOUS|DAWN|DUSK|LATER|MOMENTS LATER|SAME TIME|MORNING|EVENING)$/i, '')
                .trim()
            )
            .filter(Boolean)
        )
      );

      const locSuggestions: AutocompleteSuggestion[] = [];

      bareLocations
        .filter((loc) => !locQuery || loc.includes(locQuery))
        .slice(0, 4)
        .forEach((loc) => {
          locSuggestions.push({
            id: `loc-${loc}-day`,
            label: `${prefix} ${loc} - DAY`,
            insertText: `${prefix} ${loc} - DAY`,
            category: 'Scene Heading',
            targetBlockType: 'slugline',
          });
          locSuggestions.push({
            id: `loc-${loc}-night`,
            label: `${prefix} ${loc} - NIGHT`,
            insertText: `${prefix} ${loc} - NIGHT`,
            category: 'Scene Heading',
            targetBlockType: 'slugline',
          });
        });

      // If user typed a new location name, offer quick " - DAY" and " - NIGHT" completions
      if (locQuery.length >= 2 && !locQuery.includes('-')) {
        locSuggestions.unshift(
          {
            id: `custom-tod-day`,
            label: `${prefix} ${locQuery} - DAY`,
            insertText: `${prefix} ${locQuery} - DAY`,
            category: 'Complete with DAY',
            targetBlockType: 'slugline',
          },
          {
            id: `custom-tod-night`,
            label: `${prefix} ${locQuery} - NIGHT`,
            insertText: `${prefix} ${locQuery} - NIGHT`,
            category: 'Complete with NIGHT',
            targetBlockType: 'slugline',
          },
          {
            id: `custom-tod-cont`,
            label: `${prefix} ${locQuery} - CONTINUOUS`,
            insertText: `${prefix} ${locQuery} - CONTINUOUS`,
            category: 'Complete with CONTINUOUS',
            targetBlockType: 'slugline',
          }
        );
      }

      return locSuggestions.slice(0, 6);
    }

    // Suggest INT. / EXT. prefixes
    if (upper.length > 0 && upper.length <= 9) {
      const matches = SLUGLINE_PREFIXES.filter((p) =>
        p.label.startsWith(upper)
      );
      if (matches.length > 0) {
        return matches.map((m) => ({
          id: `prefix-${m.label}`,
          label: m.label,
          insertText: m.label,
          category: m.desc,
          targetBlockType: 'slugline',
        }));
      }
    }
  }

  // 2. Character cue autocomplete (or @mention in action)
  if (blockType === 'character' || trimmed.startsWith('@')) {
    const cleanQuery = (trimmed.startsWith('@') ? trimmed.slice(1) : trimmed).toUpperCase();

    // Check if user is typing an extension like "ELENA ("
    const parenIdx = cleanQuery.indexOf('(');
    if (parenIdx !== -1) {
      const charName = cleanQuery.slice(0, parenIdx).trim();
      const extQuery = cleanQuery.slice(parenIdx);
      return CHARACTER_EXTENSIONS.filter((ext) =>
        ext.label.startsWith(extQuery)
      ).map((ext) => ({
        id: `ext-${ext.label}`,
        label: `${charName} ${ext.label}`,
        insertText: `${charName} ${ext.label}`,
        category: ext.desc,
        targetBlockType: 'character',
      }));
    }

    const matchingChars = knownCharacters
      .filter((c) => !cleanQuery || (c.startsWith(cleanQuery) && c !== cleanQuery))
      .slice(0, 5);

    const results: AutocompleteSuggestion[] = matchingChars.map((c) => ({
      id: `char-${c}`,
      label: c,
      insertText: c,
      category: 'Character',
      targetBlockType: 'character',
    }));

    // Also offer (V.O.) and (O.S.) if user typed a complete character name
    if (cleanQuery.length >= 2) {
      results.push(
        {
          id: `char-vo-${cleanQuery}`,
          label: `${cleanQuery} (V.O.)`,
          insertText: `${cleanQuery} (V.O.)`,
          category: 'Voice Over',
          targetBlockType: 'character',
        },
        {
          id: `char-os-${cleanQuery}`,
          label: `${cleanQuery} (O.S.)`,
          insertText: `${cleanQuery} (O.S.)`,
          category: 'Off Screen',
          targetBlockType: 'character',
        }
      );
    }

    return results.slice(0, 6);
  }

  // 3. Transition autocomplete (when in transition block or typing CUT / DISSOLVE / FADE / SMASH)
  if (
    blockType === 'transition' ||
    /^(CUT|DISS|FADE|SMASH|MATCH)\b/i.test(trimmed)
  ) {
    return TRANSITIONS.filter(
      (t) => !upper || (t.label.startsWith(upper) && t.label !== upper)
    ).map((t) => ({
      id: `trans-${t.label}`,
      label: t.label,
      insertText: t.label,
      category: t.desc,
      targetBlockType: 'transition',
    }));
  }

  return [];
}

interface ScreenplayAutocompletePopoverProps {
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  position: { top: number; left: number } | null;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
}

export const ScreenplayAutocompletePopover: React.FC<
  ScreenplayAutocompletePopoverProps
> = ({ suggestions, selectedIndex, position, onSelect }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = menuRef.current;
    if (!el || suggestions.length === 0 || !position || prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: -4, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.15, ease: 'power3.out', overwrite: 'auto' }
    );
  }, [suggestions.length, Boolean(position)]);

  if (!position || suggestions.length === 0) return null;

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Screenplay autocomplete suggestions"
      style={{
        top: `${position.top + 26}px`,
        left: `${Math.min(window.innerWidth - 268, Math.max(12, position.left))}px`,
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--elevation-floating)',
        zIndex: 'var(--z-toolbar)',
      }}
      onMouseDown={(e) => e.preventDefault()}
      className="no-print fixed w-[min(16rem,calc(100vw-24px))] overflow-hidden rounded-xl p-1 text-xs"
    >
      <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
        <span>Screenplay Autocomplete</span>
        <span>Tab / ↵</span>
      </div>
      {suggestions.map((s, idx) => {
        const active = idx === selectedIndex;
        return (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(s)}
            style={{
              backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--ink-1)',
            }}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-start font-mono text-xs transition-colors hover:bg-[var(--bg-subtle-hover)]"
          >
            <span className="truncate font-semibold">{s.label}</span>
            <span className="shrink-0 font-sans text-[10px] text-[var(--ink-3)]">
              {s.category}
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface ScreenplayElementBarProps {
  activeBlockType: ScreenplayBlockType;
  onSelectBlockType: (type: ScreenplayBlockType) => void;
}

export const ScreenplayElementBar: React.FC<ScreenplayElementBarProps> = ({
  activeBlockType,
  onSelectBlockType,
}) => {
  const btnHover = gsapButtonHover({ hoverScale: 1.04, hoverY: -0.5, pressScale: 0.96 });

  const elements: {
    id: ScreenplayBlockType;
    label: string;
    mobileLabel: string;
    shortcut: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  }[] = [
    { id: 'slugline', label: 'Slugline', mobileLabel: 'Slug', shortcut: 'INT/EXT', icon: Clapperboard },
    { id: 'action', label: 'Action', mobileLabel: 'Action', shortcut: '⌘1', icon: AlignLeft },
    { id: 'character', label: 'Character', mobileLabel: 'Char', shortcut: 'Tab', icon: User },
    { id: 'dialogue', label: 'Dialogue', mobileLabel: 'Dialog', shortcut: 'Enter', icon: MessageSquare },
    { id: 'parenthetical', label: '(Paren)', mobileLabel: '(Paren)', shortcut: '(', icon: CornerDownRight },
    { id: 'transition', label: 'Transition', mobileLabel: 'Cut', shortcut: 'CUT TO:', icon: ArrowRightLeft },
  ];

  return (
    <div
      style={{
        zIndex: 'var(--z-header)',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--elevation-floating)',
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      onMouseDown={(e) => {
        // Keep focus inside editor when switching screenplay block format
        e.preventDefault();
      }}
      className="vellum-scroller no-print fixed bottom-14 left-1/2 flex max-w-[calc(100vw-20px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full p-1 text-xs sm:bottom-5"
    >
      {elements.map((item) => {
        const Icon = item.icon;
        const active = activeBlockType === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectBlockType(item.id)}
            {...btnHover}
            aria-pressed={active}
            title={`${item.label} (${item.shortcut})`}
            style={{
              backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--ink-2)',
            }}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-colors duration-150 hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)] sm:h-7 sm:gap-1.5"
          >
            <Icon className="size-3" strokeWidth={1.9} />
            <span className="sm:hidden">{item.mobileLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

