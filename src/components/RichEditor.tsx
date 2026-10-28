import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import gsap from 'gsap';
import {
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  Plus,
} from 'lucide-react';
import {
  BookPart,
  DocumentUnit,
  FocusMode,
  FontSizeStep,
  FontVoice,
  MeasureStep,
  WorkKind,
} from '../types';
import { getUnitBadgeLabel } from '../editorUtils';
import { FloatingToolbar, SelectionRectInfo } from './FloatingToolbar';
import { DocumentOutline } from './DocumentOutline';
import {
  AutocompleteSuggestion,
  computeScreenplaySuggestions,
  ScreenplayAutocompletePopover,
  ScreenplayBlockType,
  ScreenplayElementBar,
} from './ScreenplayTools';
import { gsapButtonHover, prefersReducedMotion } from '../motion';

interface RichEditorProps {
  docId: string;
  workKind: WorkKind;
  docTitle: string;
  unitId: string;
  unitTitle: string;
  unitSlugline?: string;
  initialHtml: string;
  units?: DocumentUnit[];
  parts?: BookPart[];
  knownCharacters?: string[];
  knownLocations?: string[];
  fontVoice: FontVoice;
  fontSize: FontSizeStep;
  measure: MeasureStep;
  focusMode: FocusMode;
  typewriterMode: boolean;
  sidebarOpen: boolean;
  isTyping: boolean;
  onChangeTitle: (newTitle: string) => void;
  onChangeSlugline?: (newSlugline: string) => void;
  onChangeHtml: (newHtml: string) => void;
  onSelectUnit?: (unitId: string) => void;
  onCreateNextUnit?: () => void;
  onOpenBirdsEye?: () => void;
  onUserTyping: () => void;
}

export const RichEditor: React.FC<RichEditorProps> = ({
  docId,
  workKind,
  docTitle,
  unitId,
  unitTitle,
  unitSlugline,
  initialHtml,
  units = [],
  parts = [],
  knownCharacters = [],
  knownLocations = [],
  fontVoice,
  fontSize,
  measure,
  focusMode,
  typewriterMode,
  sidebarOpen,
  isTyping,
  onChangeTitle,
  onChangeSlugline,
  onChangeHtml,
  onSelectUnit,
  onCreateNextUnit,
  onOpenBirdsEye,
  onUserTyping,
}) => {
  const mainRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const lastContentKeyRef = useRef<string>('');

  const [liveHtml, setLiveHtml] = useState<string>(initialHtml);
  const [isEmpty, setIsEmpty] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRectInfo>({
    top: 0,
    left: 0,
    visible: false,
  });
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Screenplay state
  const [activeSpBlockType, setActiveSpBlockType] =
    useState<ScreenplayBlockType>('action');
  const [spSuggestions, setSpSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [spSelectedIndex, setSpSelectedIndex] = useState<number>(0);
  const [spPopoverPos, setSpPopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [sluglineInputFocused, setSluglineInputFocused] = useState(false);

  const btnHover = gsapButtonHover({ hoverScale: 1.03, hoverY: -0.5, pressScale: 0.96 });

  const currentUnitIndex = useMemo(
    () => units.findIndex((u) => u.id === unitId),
    [units, unitId]
  );
  const currentUnit = units[currentUnitIndex];
  const prevUnit = currentUnitIndex > 0 ? units[currentUnitIndex - 1] : null;
  const nextUnit =
    currentUnitIndex >= 0 && currentUnitIndex < units.length - 1
      ? units[currentUnitIndex + 1]
      : null;

  const currentPart = useMemo(() => {
    if (workKind !== 'book' || !currentUnit?.partId) return null;
    return parts.find((p) => p.id === currentUnit.partId) || null;
  }, [workKind, currentUnit, parts]);

  const adjustTitleHeight = useCallback(() => {
    const el = titleInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustTitleHeight();
  }, [unitTitle, fontSize, fontVoice, adjustTitleHeight]);

  // Load initialHtml when switching documents or chapters/scenes
  const contentKey = `${docId}::${unitId}`;
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (lastContentKeyRef.current !== contentKey) {
      const isSwitch = lastContentKeyRef.current !== '';
      lastContentKeyRef.current = contentKey;
      const defaultHtml =
        workKind === 'screenplay'
          ? `<p data-sp-type="slugline">${unitSlugline || 'INT. LOCATION - DAY'}</p><p data-sp-type="action"><br></p>`
          : '<p><br></p>';
      el.innerHTML = initialHtml || defaultHtml;
      setLiveHtml(el.innerHTML);
      const text = (el.textContent || '').trim();
      setIsEmpty(text.length === 0);
      setSelectionRect((prev) => ({ ...prev, visible: false }));
      setSpSuggestions([]);

      if (isSwitch && mainRef.current && !prefersReducedMotion()) {
        gsap.fromTo(
          mainRef.current,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.24,
            ease: 'power3.out',
            overwrite: 'auto',
          }
        );
      }
    }
  }, [contentKey, initialHtml, workKind, unitSlugline]);

  // Resolve top-level block inside editor for a DOM node
  const getTopLevelBlock = useCallback((node: Node | null): HTMLElement | null => {
    const editor = editorRef.current;
    if (!editor || !node) return null;
    let curr: Node | null = node;
    while (curr && curr.parentNode !== editor) {
      curr = curr.parentNode;
    }
    if (curr && curr.parentNode === editor && curr.nodeType === Node.ELEMENT_NODE) {
      return curr as HTMLElement;
    }
    return null;
  }, []);

  const emitHtmlChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = (el.textContent || '').trim();
    setIsEmpty(text.length === 0);
    const html = el.innerHTML;
    setLiveHtml(html);
    onChangeHtml(html);

    // If in screenplay mode and first block is a slugline, keep unitSlugline synced
    if (workKind === 'screenplay' && onChangeSlugline) {
      const firstSlug = el.querySelector('p[data-sp-type="slugline"]');
      if (firstSlug) {
        const slugText = (firstSlug.textContent || '').trim().toUpperCase();
        if (slugText && slugText !== unitSlugline) {
          onChangeSlugline(slugText);
        }
      }
    }
  }, [onChangeHtml, workKind, onChangeSlugline, unitSlugline]);

  // Update active block highlight for Focus Mode + inspect active formatting + Screenplay block type
  const updateFocusAndToolbar = useCallback(
    (scrollTypewriter = false, checkAutocomplete = false) => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!editor || !sel || sel.rangeCount === 0) {
        setSelectionRect((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) {
        setSelectionRect((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        if (!sluglineInputFocused) {
          setSpSuggestions([]);
        }
        return;
      }

      const activeBlock = getTopLevelBlock(sel.focusNode);
      Array.from(editor.children).forEach((child) => {
        child.classList.remove('is-active-block', 'is-adjacent-block');
      });

      if (activeBlock) {
        activeBlock.classList.add('is-active-block');
        if (activeBlock.previousElementSibling) {
          activeBlock.previousElementSibling.classList.add('is-adjacent-block');
        }
        if (activeBlock.nextElementSibling) {
          activeBlock.nextElementSibling.classList.add('is-adjacent-block');
        }

        if (workKind === 'screenplay') {
          const rawType = activeBlock.getAttribute('data-sp-type') as
            | ScreenplayBlockType
            | null;
          const resolvedType: ScreenplayBlockType = rawType || 'action';
          if (!rawType && activeBlock.tagName.toLowerCase() === 'p') {
            activeBlock.setAttribute('data-sp-type', 'action');
          }
          setActiveSpBlockType(resolvedType);

          if (checkAutocomplete && sel.isCollapsed) {
            const lineText = activeBlock.textContent || '';
            const suggestions = computeScreenplaySuggestions({
              blockType: resolvedType,
              lineText,
              knownCharacters,
              knownLocations,
            });
            setSpSuggestions(suggestions);
            setSpSelectedIndex(0);
            if (suggestions.length > 0) {
              const caretRect = range.getBoundingClientRect();
              const blockRect = activeBlock.getBoundingClientRect();
              setSpPopoverPos({
                top: caretRect.top > 0 ? caretRect.top : blockRect.top,
                left: caretRect.left > 0 ? caretRect.left : blockRect.left,
              });
            } else {
              setSpPopoverPos(null);
            }
          } else if (!checkAutocomplete) {
            setSpSuggestions([]);
          }
        }
      }

      // Inspect active formatting tags around selection
      const formats = new Set<string>();
      try {
        if (document.queryCommandState('bold')) formats.add('bold');
        if (document.queryCommandState('italic')) formats.add('italic');
        if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
        if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
        if (document.queryCommandState('insertOrderedList')) formats.add('ol');
      } catch {
        // Ignore
      }

      let walker: Node | null = sel.focusNode;
      while (walker && walker !== editor) {
        if (walker.nodeType === Node.ELEMENT_NODE) {
          const tag = (walker as HTMLElement).tagName.toLowerCase();
          if (tag === 'h1') formats.add('h1');
          if (tag === 'h2') formats.add('h2');
          if (tag === 'h3') formats.add('h3');
          if (tag === 'blockquote') formats.add('blockquote');
          if (tag === 'code') formats.add('code');
        }
        walker = walker.parentNode;
      }
      setActiveFormats(formats);

      // Position Floating Toolbar if selection is non-collapsed
      if (!sel.isCollapsed && sel.toString().trim().length > 0) {
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          const clampedLeft = Math.min(
            window.innerWidth - 190,
            Math.max(190, rect.left + rect.width / 2)
          );
          setSelectionRect({
            top: rect.top - 10,
            left: clampedLeft,
            visible: true,
          });
        }
      } else {
        setSelectionRect((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }

      // Typewriter Scrolling
      if (scrollTypewriter && typewriterMode) {
        const caretRect = range.getBoundingClientRect();
        const targetY =
          caretRect.top > 0
            ? caretRect.top
            : activeBlock?.getBoundingClientRect().top ?? 0;

        if (targetY > 0) {
          const idealViewportY = window.innerHeight * 0.44;
          const delta = targetY - idealViewportY;
          if (Math.abs(delta) > 18) {
            window.scrollBy({
              top: delta,
              behavior: 'smooth',
            });
          }
        }
      }
    },
    [
      getTopLevelBlock,
      typewriterMode,
      workKind,
      knownCharacters,
      knownLocations,
      sluglineInputFocused,
    ]
  );

  useEffect(() => {
    const handleSelectionChange = () => {
      updateFocusAndToolbar(false, false);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateFocusAndToolbar]);

  // Apply a Screenplay block type to the currently focused paragraph
  const applyScreenplayBlockType = useCallback(
    (newType: ScreenplayBlockType) => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!editor || !sel) return;
      editor.focus();
      const block = getTopLevelBlock(sel.focusNode);
      if (!block) return;

      if (block.tagName.toLowerCase() !== 'p') {
        document.execCommand('formatBlock', false, 'P');
      }
      const updatedBlock = getTopLevelBlock(window.getSelection()?.focusNode || null);
      if (updatedBlock) {
        updatedBlock.setAttribute('data-sp-type', newType);
        if (
          newType === 'parenthetical' &&
          !(updatedBlock.textContent || '').trim().startsWith('(')
        ) {
          const existing = (updatedBlock.textContent || '').trim();
          updatedBlock.textContent = `(${existing})`;
          // Place caret inside parentheses
          const textNode = updatedBlock.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const r = document.createRange();
            r.setStart(textNode, Math.max(1, (textNode.textContent || '').length - 1));
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }
      }
      setActiveSpBlockType(newType);
      emitHtmlChange();
      updateFocusAndToolbar(false, true);
    },
    [getTopLevelBlock, emitHtmlChange, updateFocusAndToolbar]
  );

  // Accept an autocomplete suggestion inside the screenplay editor
  const handleAcceptSuggestion = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!editor || !sel) return;

      const block = getTopLevelBlock(sel.focusNode);
      if (!block) return;

      if (suggestion.targetBlockType) {
        block.setAttribute('data-sp-type', suggestion.targetBlockType);
        setActiveSpBlockType(suggestion.targetBlockType);
      }

      block.textContent = suggestion.insertText;

      // Move caret to the end of the inserted text
      const textNode = block.firstChild;
      if (textNode) {
        const range = document.createRange();
        const len = textNode.textContent?.length ?? 0;
        range.setStart(textNode, len);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      setSpSuggestions([]);
      setSpPopoverPos(null);
      emitHtmlChange();
    },
    [getTopLevelBlock, emitHtmlChange]
  );

  const executeCommand = useCallback(
    (command: string, value?: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();

      if (command === 'inlineCode') {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const parentEl =
          sel.focusNode?.nodeType === Node.ELEMENT_NODE
            ? (sel.focusNode as HTMLElement)
            : sel.focusNode?.parentElement;

        if (parentEl && parentEl.tagName.toLowerCase() === 'code') {
          const textNode = document.createTextNode(parentEl.textContent || '');
          parentEl.replaceWith(textNode);
          const newRange = document.createRange();
          newRange.selectNodeContents(textNode);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else if (!sel.isCollapsed) {
          const selectedText = sel.toString();
          document.execCommand('insertHTML', false, `<code>${selectedText}</code>`);
        }
      } else {
        document.execCommand(command, false, value);
      }

      emitHtmlChange();
      updateFocusAndToolbar(false, false);
    },
    [emitHtmlChange, updateFocusAndToolbar]
  );

  // Handle Live Markdown Shortcuts, Screenplay Flow, & Keyboard Formatting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = e.metaKey || e.ctrlKey;

    // 1. If Screenplay Autocomplete Popover is open, handle ArrowDown/Up, Tab/Enter, Escape
    if (workKind === 'screenplay' && spSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSpSelectedIndex((prev) => (prev + 1) % spSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSpSelectedIndex(
          (prev) => (prev - 1 + spSuggestions.length) % spSuggestions.length
        );
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        const chosen = spSuggestions[spSelectedIndex] || spSuggestions[0];
        if (chosen) {
          e.preventDefault();
          handleAcceptSuggestion(chosen);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSpSuggestions([]);
        return;
      }
    }

    // 2. Screenplay Tab & Enter Conversation Flow
    if (workKind === 'screenplay') {
      // Tab cycles Action -> Character -> Parenthetical -> Transition -> Slugline
      if (e.key === 'Tab' && !isMod) {
        e.preventDefault();
        const cycleOrder: ScreenplayBlockType[] = [
          'action',
          'character',
          'dialogue',
          'parenthetical',
          'transition',
          'slugline',
        ];
        // Common screenplay shortcut: Tab from empty Action or Dialogue jumps directly to Character
        const sel = window.getSelection();
        const block = getTopLevelBlock(sel?.focusNode || null);
        const isBlockEmpty = (block?.textContent || '').trim().length === 0;

        if (isBlockEmpty && activeSpBlockType === 'action') {
          applyScreenplayBlockType('character');
        } else if (isBlockEmpty && activeSpBlockType === 'dialogue') {
          applyScreenplayBlockType('parenthetical');
        } else {
          const nextType =
            cycleOrder[(cycleOrder.indexOf(activeSpBlockType) + 1) % cycleOrder.length];
          applyScreenplayBlockType(nextType);
        }
        return;
      }

      // Enter in Screenplay mode transitions smoothly between Character -> Dialogue -> Action
      if (e.key === 'Enter' && !e.shiftKey && !isMod) {
        const sel = window.getSelection();
        const block = getTopLevelBlock(sel?.focusNode || null);
        if (block && editorRef.current) {
          e.preventDefault();
          const currentType =
            (block.getAttribute('data-sp-type') as ScreenplayBlockType) || 'action';

          // Determine what the next line's screenplay element should be
          let nextType: ScreenplayBlockType = 'action';
          if (currentType === 'slugline') nextType = 'action';
          else if (currentType === 'character') nextType = 'dialogue';
          else if (currentType === 'parenthetical') nextType = 'dialogue';
          else if (currentType === 'dialogue') nextType = 'action';
          else if (currentType === 'transition') nextType = 'slugline';

          const newP = document.createElement('p');
          newP.setAttribute('data-sp-type', nextType);
          newP.innerHTML = '<br>';
          block.insertAdjacentElement('afterend', newP);

          const range = document.createRange();
          range.setStart(newP, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);

          setActiveSpBlockType(nextType);
          emitHtmlChange();
          updateFocusAndToolbar(true, false);
          return;
        }
      }
    }

    if (isMod && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        executeCommand('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        executeCommand('italic');
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        executeCommand('inlineCode');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        executeCommand('strikeThrough');
        return;
      }
      if (e.shiftKey && key === '9') {
        e.preventDefault();
        const isQuote = activeFormats.has('blockquote');
        executeCommand('formatBlock', isQuote ? 'P' : 'BLOCKQUOTE');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      const block = getTopLevelBlock(sel?.focusNode || null);
      if (
        block &&
        block.tagName.toLowerCase() === 'blockquote' &&
        (block.textContent || '').trim() === ''
      ) {
        e.preventDefault();
        document.execCommand('formatBlock', false, 'P');
        emitHtmlChange();
        return;
      }
    }

    // Live Markdown Prefix Triggers on Space
    if (e.key === ' ' && !isMod) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.focusNode?.nodeType === Node.TEXT_NODE) {
        const textNode = sel.focusNode as Text;
        const beforeCaret = (textNode.textContent || '').slice(0, sel.focusOffset);
        const block = getTopLevelBlock(textNode);

        if (block && block.textContent?.startsWith(beforeCaret)) {
          if (workKind === 'screenplay') {
            // Fountain-like triggers for Screenplay mode:
            // ". " forces a slugline, "> " forces a transition, "@ " forces a character cue
            if (beforeCaret === '.') {
              e.preventDefault();
              textNode.textContent = (textNode.textContent || '').slice(sel.focusOffset);
              block.setAttribute('data-sp-type', 'slugline');
              setActiveSpBlockType('slugline');
              emitHtmlChange();
              updateFocusAndToolbar(true, true);
              return;
            }
            if (beforeCaret === '>') {
              e.preventDefault();
              textNode.textContent = (textNode.textContent || '').slice(sel.focusOffset);
              block.setAttribute('data-sp-type', 'transition');
              setActiveSpBlockType('transition');
              emitHtmlChange();
              updateFocusAndToolbar(true, true);
              return;
            }
            if (beforeCaret === '@') {
              e.preventDefault();
              textNode.textContent = (textNode.textContent || '').slice(sel.focusOffset);
              block.setAttribute('data-sp-type', 'character');
              setActiveSpBlockType('character');
              emitHtmlChange();
              updateFocusAndToolbar(true, true);
              return;
            }
          }

          const triggers: Record<string, () => void> = {
            '#': () => document.execCommand('formatBlock', false, 'H1'),
            '##': () => document.execCommand('formatBlock', false, 'H2'),
            '###': () => document.execCommand('formatBlock', false, 'H3'),
            '>': () => document.execCommand('formatBlock', false, 'BLOCKQUOTE'),
            '-': () => document.execCommand('insertUnorderedList'),
            '*': () => document.execCommand('insertUnorderedList'),
            '1.': () => document.execCommand('insertOrderedList'),
            '---': () => {
              document.execCommand('insertHorizontalRule');
              document.execCommand('formatBlock', false, 'P');
            },
          };

          const action = triggers[beforeCaret];
          if (action) {
            e.preventDefault();
            textNode.textContent = (textNode.textContent || '').slice(sel.focusOffset);
            action();
            emitHtmlChange();
            updateFocusAndToolbar(true, false);
            return;
          }
        }
      }
    }

    if (
      !isMod &&
      e.key !== 'Escape' &&
      e.key !== 'Shift' &&
      e.key !== 'Control' &&
      e.key !== 'Alt' &&
      e.key !== 'Meta'
    ) {
      onUserTyping();
    }
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.childNodes.length === 0) {
      editor.innerHTML =
        workKind === 'screenplay'
          ? '<p data-sp-type="action"><br></p>'
          : '<p><br></p>';
    } else if (
      editor.childNodes.length === 1 &&
      editor.firstChild?.nodeType === Node.TEXT_NODE
    ) {
      document.execCommand('formatBlock', false, 'P');
    }

    // In screenplay mode, auto-detect "(" at start of line for parenthetical or "@NAME" for character
    if (workKind === 'screenplay') {
      const sel = window.getSelection();
      const block = getTopLevelBlock(sel?.focusNode || null);
      if (block && block.tagName.toLowerCase() === 'p') {
        const text = (block.textContent || '').trimStart();
        if (text.startsWith('(') && block.getAttribute('data-sp-type') !== 'parenthetical') {
          block.setAttribute('data-sp-type', 'parenthetical');
          setActiveSpBlockType('parenthetical');
        } else if (
          text.startsWith('@') &&
          block.getAttribute('data-sp-type') !== 'character'
        ) {
          block.setAttribute('data-sp-type', 'character');
          block.textContent = text.slice(1);
          setActiveSpBlockType('character');
        } else if (
          /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i.test(text) &&
          block.getAttribute('data-sp-type') !== 'slugline'
        ) {
          block.setAttribute('data-sp-type', 'slugline');
          setActiveSpBlockType('slugline');
        }
      }
    }

    emitHtmlChange();
    updateFocusAndToolbar(true, true);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length <= 1) {
      document.execCommand('insertText', false, text);
    } else {
      const html = paragraphs
        .map((p) => {
          const escaped = p
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
          return workKind === 'screenplay'
            ? `<p data-sp-type="action">${escaped}</p>`
            : `<p>${escaped}</p>`;
        })
        .join('');
      document.execCommand('insertHTML', false, html);
    }
    emitHtmlChange();
    updateFocusAndToolbar(true, false);
  };

  const fontClass =
    fontVoice === 'serif'
      ? 'font-serif'
      : fontVoice === 'sans'
      ? 'font-sans'
      : 'font-mono';

  const sizeStyle: React.CSSProperties =
    fontSize === 'sm'
      ? { fontSize: '1.0625rem', lineHeight: 1.62 }
      : fontSize === 'base'
      ? { fontSize: '1.1875rem', lineHeight: 1.65 }
      : fontSize === 'lg'
      ? { fontSize: '1.3125rem', lineHeight: 1.68 }
      : { fontSize: '1.5rem', lineHeight: 1.68 };

  const measureClass =
    measure === 'narrow'
      ? 'max-w-[56ch]'
      : measure === 'balanced'
      ? 'max-w-[65ch]'
      : 'max-w-[74ch]';

  const currentBadge = currentUnit
    ? getUnitBadgeLabel(currentUnit, units)
    : '';

  return (
    <>
      <DocumentOutline
        workKind={workKind}
        docTitle={docTitle}
        contentHtml={liveHtml}
        units={units}
        activeUnitId={unitId}
        onSelectUnit={onSelectUnit}
        editorContainerRef={editorRef}
        titleInputRef={titleInputRef}
        sidebarOpen={sidebarOpen}
        isTyping={isTyping}
      />

      {workKind === 'screenplay' && (
        <>
          <ScreenplayAutocompletePopover
            suggestions={spSuggestions}
            selectedIndex={spSelectedIndex}
            position={spPopoverPos}
            onSelect={handleAcceptSuggestion}
          />
          <ScreenplayElementBar
            activeBlockType={activeSpBlockType}
            onSelectBlockType={applyScreenplayBlockType}
          />
        </>
      )}

      <main
        ref={mainRef}
        className={`mx-auto w-full px-6 transition-[max-width,padding] duration-200 ease-out sm:px-10 ${measureClass} ${fontClass}`}
        style={{
          paddingTop: typewriterMode ? '32vh' : '7.5rem',
          paddingBottom: typewriterMode ? '52vh' : '12rem',
        }}
      >
        <FloatingToolbar
          rect={selectionRect}
          activeFormats={activeFormats}
          onCommand={executeCommand}
        />

        {/* Focused Chapter / Scene Eyebrow Bar (for Books & Screenplays) */}
        {(workKind === 'book' || workKind === 'screenplay') && currentUnit && (
          <div
            style={{ opacity: focusMode !== 'off' ? 0.35 : 1 }}
            className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 font-sans text-xs transition-opacity duration-200"
          >
            <div className="flex items-center gap-2">
              {currentPart && (
                <>
                  <span className="font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                    {currentPart.title}
                  </span>
                  <span className="text-[var(--ink-4)]">·</span>
                </>
              )}
              <span
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
              >
                {currentBadge}
              </span>
              <span className="text-[11px] text-[var(--ink-3)] [font-variant-numeric:tabular-nums]">
                {currentUnitIndex + 1} of {units.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {prevUnit && onSelectUnit && (
                <button
                  type="button"
                  onClick={() => onSelectUnit(prevUnit.id)}
                  {...btnHover}
                  title={`Previous: ${getUnitBadgeLabel(prevUnit, units)}`}
                  className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
                >
                  <ArrowLeft className="size-3" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
              )}
              {nextUnit && onSelectUnit && (
                <button
                  type="button"
                  onClick={() => onSelectUnit(nextUnit.id)}
                  {...btnHover}
                  title={`Next: ${getUnitBadgeLabel(nextUnit, units)}`}
                  className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="size-3" />
                </button>
              )}
              {onOpenBirdsEye && (
                <button
                  type="button"
                  onClick={onOpenBirdsEye}
                  {...btnHover}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                  }}
                  title="Open Bird’s-Eye View tile grid (⌘M)"
                  className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
                >
                  <LayoutGrid className="size-3 text-[var(--accent)]" />
                  <span>
                    {workKind === 'book' ? 'All Chapters' : 'All Scenes'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document / Chapter / Scene Title Field */}
        <div className="mb-6">
          <label htmlFor="manuscript-title" className="sr-only">
            {workKind === 'book'
              ? 'Chapter title'
              : workKind === 'screenplay'
              ? 'Scene title'
              : 'Manuscript title'}
          </label>
          <textarea
            ref={titleInputRef}
            id="manuscript-title"
            rows={1}
            value={unitTitle}
            onChange={(e) => {
              onChangeTitle(e.target.value);
              onUserTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                editorRef.current?.focus();
              }
            }}
            placeholder={
              workKind === 'book'
                ? `Title for ${currentBadge || 'Chapter'}…`
                : workKind === 'screenplay'
                ? 'Scene Title (e.g., The Unlabeled Reel)…'
                : 'Untitled manuscript'
            }
            style={{
              fontSize:
                fontSize === 'sm'
                  ? '1.85rem'
                  : fontSize === 'base'
                  ? '2.15rem'
                  : fontSize === 'lg'
                  ? '2.45rem'
                  : '2.75rem',
              lineHeight: 1.15,
              letterSpacing: '-0.022em',
              opacity: focusMode !== 'off' ? 0.35 : 1,
            }}
            className="vellum-title-input w-full resize-none overflow-hidden bg-transparent font-semibold text-[var(--ink-1)] transition-opacity duration-200 placeholder:text-[var(--ink-4)]"
          />

          {workKind === 'screenplay' && (
            <div
              style={{ opacity: focusMode !== 'off' ? 0.35 : 1 }}
              className="mt-2 flex flex-wrap items-center gap-2 font-sans text-[11px] text-[var(--ink-3)]"
            >
              <span>
                Tip: Type <code className="rounded bg-[var(--bg-subtle)] px-1 py-0.5 font-mono text-[var(--ink-2)]">INT.</code> or{' '}
                <code className="rounded bg-[var(--bg-subtle)] px-1 py-0.5 font-mono text-[var(--ink-2)]">EXT.</code> for slugline autocomplete, or press{' '}
                <code className="rounded bg-[var(--bg-subtle)] px-1 py-0.5 font-mono text-[var(--ink-2)]">Tab</code> to cue a Character &amp; Dialogue.
              </span>
            </div>
          )}
        </div>

        {/* Rich Text / Screenplay Writing Canvas */}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Manuscript body"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          data-work-kind={workKind}
          data-focus-mode={focusMode}
          data-empty={isEmpty ? 'true' : 'false'}
          data-placeholder={
            workKind === 'screenplay'
              ? 'Type INT. or EXT. for a scene heading, or press Tab for a character cue…'
              : 'Begin writing, or type # for a heading…'
          }
          style={sizeStyle}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyUp={(e) => {
            if (
              e.key !== 'ArrowUp' &&
              e.key !== 'ArrowDown' &&
              e.key !== 'Enter' &&
              e.key !== 'Tab' &&
              e.key !== 'Escape'
            ) {
              updateFocusAndToolbar(true, true);
            }
          }}
          onMouseUp={() => updateFocusAndToolbar(false, false)}
          onFocus={() => setSluglineInputFocused(false)}
          className="vellum-editor relative min-h-[55vh] w-full text-[var(--ink-1)]"
        />

        {/* End-of-Chapter / End-of-Scene Turn Bar (for Books & Screenplays) */}
        {(workKind === 'book' || workKind === 'screenplay') && (
          <div className="no-print mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-6 font-sans text-xs">
            <div>
              {prevUnit && onSelectUnit ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectUnit(prevUnit.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  {...btnHover}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                  }}
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-start text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
                >
                  <ArrowLeft className="size-3.5 text-[var(--ink-3)]" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--ink-3)]">
                      Previous { getUnitBadgeLabel(prevUnit, units) }
                    </div>
                    <div className="font-medium text-[var(--ink-1)]">
                      {prevUnit.title || prevUnit.slugline || 'Untitled'}
                    </div>
                  </div>
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-2">
              {onOpenBirdsEye && (
                <button
                  type="button"
                  onClick={onOpenBirdsEye}
                  {...btnHover}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                  }}
                  className="flex h-10 items-center gap-1.5 rounded-xl px-3.5 font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-subtle-hover)] hover:text-[var(--ink-1)]"
                >
                  <LayoutGrid className="size-3.5 text-[var(--accent)]" />
                  <span>Bird’s-Eye View</span>
                </button>
              )}

              {nextUnit && onSelectUnit ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectUnit(nextUnit.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  {...btnHover}
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--elevation-raised)',
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-4 py-2 text-end text-[var(--ink-1)]"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--accent)]">
                      Next · {getUnitBadgeLabel(nextUnit, units)}
                    </div>
                    <div className="font-medium text-[var(--ink-1)]">
                      {nextUnit.title || nextUnit.slugline || 'Untitled'}
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-[var(--accent)]" />
                </button>
              ) : (
                onCreateNextUnit && (
                  <button
                    type="button"
                    onClick={onCreateNextUnit}
                    {...btnHover}
                    style={{
                      backgroundColor: 'var(--ink-1)',
                      color: 'var(--bg-canvas)',
                    }}
                    className="flex h-10 items-center gap-1.5 rounded-xl px-4 font-medium"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                    <span>
                      {workKind === 'book'
                        ? 'Start Next Chapter'
                        : 'Start Next Scene'}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
};
