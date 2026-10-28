import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookPart,
  BookSectionKind,
  DocumentItem,
  DocumentUnit,
  FocusMode,
  WorkKind,
  WorkspaceViewMode,
  WriterSettings,
} from './types';
import {
  loadSettings,
  saveSettings,
  loadDocumentsSync,
  loadActiveDocIdSync,
  saveActiveDocIdSync,
  saveDocuments,
  hydrateDocumentsFromIndexedDB,
  createNewWorkItem,
  NewWorkOptions,
} from './storage';
import {
  computeDocumentTotalMetrics,
  documentToFullMarkdown,
  downloadFile,
  extractScreenplayCharacters,
  extractScreenplayLocations,
  getUnitBadgeLabel,
  escapeHtml,
  slugifyFilename,
} from './editorUtils';
import { TitlePageDialog } from './components/TitlePageDialog';
import { ScreenplayExportDialog } from './components/ScreenplayExportDialog';
import { renderScreenplayHtml, snapshotSignatures } from './screenplayExport';
import { TopBar } from './components/TopBar';
import { SidebarDrawer } from './components/SidebarDrawer';
import { RichEditor } from './components/RichEditor';
import { BirdsEyeView } from './components/BirdsEyeView';
import { ProjectCabinetView } from './components/ProjectCabinetView';
import { NewWorkModal } from './components/NewWorkModal';
import { BottomHud } from './components/BottomHud';
import { ShortcutsModal } from './components/ShortcutsModal';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<WriterSettings>(() => loadSettings());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => loadDocumentsSync());
  const [activeDocId, setActiveDocId] = useState<string>(() =>
    loadActiveDocIdSync(loadDocumentsSync())
  );
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('write');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newWorkModalOpen, setNewWorkModalOpen] = useState(false);
  const [newWorkDefaultKind, setNewWorkDefaultKind] = useState<
    WorkKind | undefined
  >(undefined);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [screenplayGuideOpen, setScreenplayGuideOpen] = useState(false);
  const [titlePageOpen, setTitlePageOpen] = useState(false);
  const closeTitlePage = useCallback(() => setTitlePageOpen(false), []);
  const [screenplayExportOpen, setScreenplayExportOpen] = useState(false);
  const closeScreenplayExport = useCallback(() => setScreenplayExportOpen(false), []);
  const [isTyping, setIsTyping] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const lastPointerPos = useRef<{ x: number; y: number } | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Hydrate from IndexedDB if available
  useEffect(() => {
    hydrateDocumentsFromIndexedDB().then((idbDocs) => {
      if (idbDocs && idbDocs.length > 0) {
        setDocuments((current) => {
          const currentLatest = Math.max(...current.map((d) => d.updatedAt), 0);
          const idbLatest = Math.max(...idbDocs.map((d) => d.updatedAt), 0);
          return idbLatest > currentLatest ? idbDocs : current;
        });
      }
    });
  }, []);

  // Apply theme attribute & mobile status bar theme-color without ragged cascade transitions
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', settings.theme);
    const metaTheme = document.getElementById('vellum-theme-color');
    if (metaTheme) {
      const themeColors: Record<string, string> = {
        paper: '#F6F2EA',
        sepia: '#F3ECE0',
        night: '#141312',
      };
      metaTheme.setAttribute('content', themeColors[settings.theme] || '#F6F2EA');
    }
    const timer = window.setTimeout(() => {
      root.classList.remove('theme-switching');
    }, 40);
    return () => window.clearTimeout(timer);
  }, [settings.theme]);

  const updateSettings = useCallback((partial: Partial<WriterSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || documents[0];
  }, [documents, activeDocId]);

  const activeUnit = useMemo((): DocumentUnit | null => {
    if (activeDoc.kind === 'essay' || !activeDoc.units || activeDoc.units.length === 0) {
      return null;
    }
    return (
      activeDoc.units.find((u) => u.id === activeDoc.activeUnitId) ||
      activeDoc.units[0]
    );
  }, [activeDoc]);

  const activeUnitBadge = useMemo(() => {
    if (!activeUnit || !activeDoc.units) return undefined;
    return getUnitBadgeLabel(activeUnit, activeDoc.units);
  }, [activeUnit, activeDoc.units]);

  const metrics = useMemo(() => {
    return computeDocumentTotalMetrics(activeDoc);
  }, [activeDoc]);

  const knownCharacters = useMemo(() => {
    if (activeDoc.kind !== 'screenplay') return [];
    return extractScreenplayCharacters(activeDoc);
  }, [activeDoc]);

  const knownLocations = useMemo(() => {
    if (activeDoc.kind !== 'screenplay') return [];
    return extractScreenplayLocations(activeDoc);
  }, [activeDoc]);

  const persistDocs = useCallback((nextDocs: DocumentItem[]) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveDocuments(nextDocs).then(() => {
      saveTimerRef.current = window.setTimeout(() => {
        setSaveStatus('saved');
      }, 280);
    });
  }, []);

  // The guide lives in the screenplay editor: close it whenever that editor
  // is not on screen, so it never reopens unexpectedly later
  useEffect(() => {
    if (viewMode !== 'write' || activeDoc.kind !== 'screenplay') {
      setScreenplayGuideOpen(false);
    }
  }, [viewMode, activeDoc.kind]);

  // Update active document helper
  const updateActiveDocument = useCallback(
    (updater: (doc: DocumentItem) => DocumentItem) => {
      setDocuments((prev) => {
        const next = prev.map((d) =>
          d.id === activeDoc.id
            ? { ...updater(d), updatedAt: Date.now() }
            : d
        );
        persistDocs(next);
        return next;
      });
    },
    [activeDoc.id, persistDocs]
  );

  // Handlers for Essay vs Book/Screenplay unit editing
  const handleEditorTitleChange = useCallback(
    (newTitle: string) => {
      updateActiveDocument((doc) => {
        if (doc.kind === 'essay' || !doc.units || !activeUnit) {
          return { ...doc, title: newTitle };
        }
        return {
          ...doc,
          units: doc.units.map((u) =>
            u.id === activeUnit.id
              ? { ...u, title: newTitle, updatedAt: Date.now() }
              : u
          ),
        };
      });
    },
    [updateActiveDocument, activeUnit]
  );

  const handleEditorSluglineChange = useCallback(
    (newSlugline: string) => {
      if (!activeUnit) return;
      updateActiveDocument((doc) => ({
        ...doc,
        units: (doc.units || []).map((u) =>
          u.id === activeUnit.id
            ? { ...u, slugline: newSlugline, updatedAt: Date.now() }
            : u
        ),
      }));
    },
    [updateActiveDocument, activeUnit]
  );

  const handleEditorHtmlChange = useCallback(
    (newHtml: string) => {
      updateActiveDocument((doc) => {
        if (doc.kind === 'essay' || !doc.units || !activeUnit) {
          return { ...doc, contentHtml: newHtml };
        }
        return {
          ...doc,
          units: doc.units.map((u) =>
            u.id === activeUnit.id
              ? { ...u, contentHtml: newHtml, updatedAt: Date.now() }
              : u
          ),
        };
      });
    },
    [updateActiveDocument, activeUnit]
  );

  // Bird's-Eye View handlers
  const handleSelectUnitAndWrite = useCallback(
    (unitId: string) => {
      updateActiveDocument((doc) => ({
        ...doc,
        activeUnitId: unitId,
      }));
      setViewMode('write');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [updateActiveDocument]
  );

  const handleAddUnit = useCallback(
    (
      unitKind: BookSectionKind | 'scene',
      partId?: string,
      customLabel?: string,
      openImmediately = false
    ) => {
      const now = Date.now();
      const newUnitId = `unit-${now}-${Math.random().toString(36).slice(2, 6)}`;

      updateActiveDocument((doc) => {
        const existingUnits = doc.units || [];
        const newUnit: DocumentUnit =
          unitKind === 'scene'
            ? {
                id: newUnitId,
                unitKind: 'scene',
                slugline: 'INT. LOCATION - DAY',
                title: `Scene ${existingUnits.length + 1}`,
                synopsis: '',
                contentHtml:
                  '<p data-sp-type="slugline">INT. LOCATION - DAY</p><p data-sp-type="action"><br></p>',
                updatedAt: now,
              }
            : {
                id: newUnitId,
                unitKind,
                customLabel,
                partId:
                  partId ??
                  (doc.parts && doc.parts.length > 0
                    ? doc.parts[doc.parts.length - 1].id
                    : undefined),
                title:
                  unitKind === 'prologue'
                    ? 'Prologue'
                    : unitKind === 'epilogue'
                    ? 'Epilogue'
                    : unitKind === 'interlude'
                    ? 'Interlude'
                    : '',
                synopsis: '',
                contentHtml: '<p><br></p>',
                updatedAt: now,
              };

        // Insert Prologue at beginning, everything else at the end
        const nextUnits =
          unitKind === 'prologue'
            ? [newUnit, ...existingUnits]
            : [...existingUnits, newUnit];

        return {
          ...doc,
          units: nextUnits,
          activeUnitId: openImmediately ? newUnitId : doc.activeUnitId || newUnitId,
        };
      });

      if (openImmediately) {
        setViewMode('write');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [updateActiveDocument]
  );

  const handleUpdateUnitMeta = useCallback(
    (
      unitId: string,
      patch: Partial<
        Pick<
          DocumentUnit,
          'title' | 'synopsis' | 'partId' | 'customLabel' | 'slugline'
        >
      >
    ) => {
      updateActiveDocument((doc) => ({
        ...doc,
        units: (doc.units || []).map((u) =>
          u.id === unitId ? { ...u, ...patch, updatedAt: Date.now() } : u
        ),
      }));
    },
    [updateActiveDocument]
  );

  const handleMoveUnit = useCallback(
    (unitId: string, direction: -1 | 1) => {
      updateActiveDocument((doc) => {
        const list = [...(doc.units || [])];
        const idx = list.findIndex((u) => u.id === unitId);
        const targetIdx = idx + direction;
        if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return doc;
        const [moved] = list.splice(idx, 1);
        list.splice(targetIdx, 0, moved);
        return { ...doc, units: list };
      });
    },
    [updateActiveDocument]
  );

  const handleDeleteUnit = useCallback(
    (unitId: string) => {
      updateActiveDocument((doc) => {
        const list = doc.units || [];
        if (list.length <= 1) return doc;
        const nextUnits = list.filter((u) => u.id !== unitId);
        const nextActiveId =
          doc.activeUnitId === unitId ? nextUnits[0].id : doc.activeUnitId;
        return {
          ...doc,
          units: nextUnits,
          activeUnitId: nextActiveId,
        };
      });
    },
    [updateActiveDocument]
  );

  // Book Optional Parts Management
  const handleAddPart = useCallback(
    (title?: string) => {
      const now = Date.now();
      const newPartId = `part-${now}-${Math.random().toString(36).slice(2, 5)}`;
      updateActiveDocument((doc) => {
        const currentParts = doc.parts || [];
        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        const partLabel =
          title ||
          `Part ${roman[currentParts.length] || currentParts.length + 1}`;
        const nextParts: BookPart[] = [
          ...currentParts,
          { id: newPartId, title: partLabel },
        ];
        // If this was the first Part added, assign any unassigned chapters to it
        const nextUnits =
          currentParts.length === 0
            ? (doc.units || []).map((u) => ({ ...u, partId: newPartId }))
            : doc.units;
        return {
          ...doc,
          parts: nextParts,
          units: nextUnits,
        };
      });
    },
    [updateActiveDocument]
  );

  const handleRenamePart = useCallback(
    (partId: string, title: string) => {
      updateActiveDocument((doc) => ({
        ...doc,
        parts: (doc.parts || []).map((p) =>
          p.id === partId ? { ...p, title } : p
        ),
      }));
    },
    [updateActiveDocument]
  );

  const handleDeletePart = useCallback(
    (partId: string) => {
      updateActiveDocument((doc) => {
        const nextParts = (doc.parts || []).filter((p) => p.id !== partId);
        const fallbackPartId = nextParts[0]?.id;
        const nextUnits = (doc.units || []).map((u) =>
          u.partId === partId ? { ...u, partId: fallbackPartId } : u
        );
        return {
          ...doc,
          parts: nextParts,
          units: nextUnits,
        };
      });
    },
    [updateActiveDocument]
  );

  // Create a new Book, Screenplay, or Essay
  const handleCreateWork = useCallback(
    (
      kind: WorkKind,
      title: string,
      options?: NewWorkOptions
    ) => {
      const newDoc = createNewWorkItem(kind, title, options);
      setDocuments((prev) => {
        const next = [newDoc, ...prev];
        persistDocs(next);
        return next;
      });
      setActiveDocId(newDoc.id);
      saveActiveDocIdSync(newDoc.id);
      if ((kind === 'book' || kind === 'screenplay') && options?.openInTimeline) {
        setViewMode('birdseye');
      } else {
        setViewMode('write');
      }
      if (options?.startInFocusMode) {
        updateSettings({ focusMode: 'paragraph' });
      }
      setSidebarOpen(false);
      setIsTyping(false);
    },
    [persistDocs, updateSettings]
  );

  const handleSelectDoc = useCallback((id: string) => {
    setActiveDocId(id);
    saveActiveDocIdSync(id);
    setViewMode('write');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleSelectDocUnit = useCallback(
    (docId: string, unitId: string) => {
      setActiveDocId(docId);
      saveActiveDocIdSync(docId);
      setDocuments((prev) => {
        const next = prev.map((d) =>
          d.id === docId ? { ...d, activeUnitId: unitId } : d
        );
        persistDocs(next);
        return next;
      });
      setViewMode('write');
      setSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [persistDocs]
  );

  const handleSelectDocBirdsEye = useCallback((id: string) => {
    setActiveDocId(id);
    saveActiveDocIdSync(id);
    setViewMode('birdseye');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleOpenNewWorkModal = useCallback((defaultKind?: WorkKind) => {
    setNewWorkDefaultKind(defaultKind);
    setNewWorkModalOpen(true);
  }, []);

  const handleTogglePin = useCallback(
    (id: string) => {
      setDocuments((prev) => {
        const next = prev.map((d) =>
          d.id === id ? { ...d, pinned: !d.pinned } : d
        );
        persistDocs(next);
        return next;
      });
    },
    [persistDocs]
  );

  const handleDuplicateDoc = useCallback(
    (id: string) => {
      const source = documents.find((d) => d.id === id);
      if (!source) return;
      const copy: DocumentItem = {
        ...source,
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: source.title ? `${source.title} (Copy)` : 'Untitled (Copy)',
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setDocuments((prev) => {
        const next = [copy, ...prev];
        persistDocs(next);
        return next;
      });
      setActiveDocId(copy.id);
      saveActiveDocIdSync(copy.id);
    },
    [documents, persistDocs]
  );

  const handleDeleteDoc = useCallback(
    (id: string) => {
      setDocuments((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((d) => d.id !== id);
        persistDocs(next);
        if (id === activeDoc.id && next[0]) {
          setActiveDocId(next[0].id);
          saveActiveDocIdSync(next[0].id);
        }
        return next;
      });
    },
    [activeDoc.id, persistDocs]
  );

  // Restore UI chrome when mouse moves purposefully
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!lastPointerPos.current) {
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const dx = Math.abs(e.clientX - lastPointerPos.current.x);
      const dy = Math.abs(e.clientY - lastPointerPos.current.y);
      if (dx + dy > 8) {
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        setIsTyping(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // The editor already handled it (e.g. ⌘⇧D dual dialogue)
      if (e.defaultPrevented || e.isComposing) return;
      if (e.key === 'Escape') {
        setIsTyping(false);
        if (sidebarOpen) setSidebarOpen(false);
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Screenplay guide: ⌘⌥/ (Ctrl+Alt+/ on Windows) or F1. ⌘? is taken by
      // the macOS Help menu, so it never reaches the page.
      const guideKey =
        e.key === 'F1' || (isMod && e.altKey && !e.shiftKey && e.code === 'Slash');
      if (guideKey) {
        if (activeDoc.kind === 'screenplay') {
          e.preventDefault();
          setViewMode('write');
          setScreenplayGuideOpen((v) => !v);
          setIsTyping(false);
        }
        return;
      }

      // Other ⌘⌥ combinations belong to the editor (element shortcuts)
      if (!isMod || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'm') {
        if (activeDoc.kind === 'book' || activeDoc.kind === 'screenplay') {
          e.preventDefault();
          setViewMode((v) => (v === 'birdseye' ? 'write' : 'birdseye'));
          setIsTyping(false);
        }
      } else if (key === 'k') {
        const sel = window.getSelection();
        const hasRangeSelection = sel && !sel.isCollapsed;
        if (!hasRangeSelection) {
          e.preventDefault();
          setViewMode((v) => (v === 'cabinet' ? 'write' : 'cabinet'));
          setIsTyping(false);
        }
      } else if (key === 'd' && !e.shiftKey) {
        e.preventDefault();
        const order: FocusMode[] = ['off', 'paragraph', 'deep'];
        const next = order[(order.indexOf(settings.focusMode) + 1) % order.length];
        updateSettings({ focusMode: next });
      } else if (key === 't' && !e.shiftKey) {
        e.preventDefault();
        updateSettings({ typewriterMode: !settings.typewriterMode });
      } else if (e.key === '\\') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
        setIsTyping(false);
      } else if (e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        setIsTyping(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    activeDoc.kind,
    settings.focusMode,
    settings.typewriterMode,
    sidebarOpen,
    updateSettings,
  ]);

  const handleUserTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
    }
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isTyping, sidebarOpen]);

  // Export & Copy handlers (exports the full Book, Screenplay, or Essay)
  const handleExportMarkdown = () => {
    const md = documentToFullMarkdown(activeDoc);
    downloadFile(
      `${slugifyFilename(activeDoc.title)}.md`,
      md,
      'text/markdown;charset=utf-8'
    );
  };

  const handleExportText = () => {
    // The Markdown/Fountain text is already plain text; parsing it as HTML
    // would drop anything that looks like a tag (and could run markup)
    const body = documentToFullMarkdown(activeDoc).trim();
    downloadFile(
      `${slugifyFilename(activeDoc.title)}.txt`,
      `${body}\n`,
      'text/plain;charset=utf-8'
    );
  };

  const handleExportHtml = () => {
    // Screenplays export as paginated, industry-formatted pages
    if (activeDoc.kind === 'screenplay') {
      downloadFile(
        `${slugifyFilename(activeDoc.title)}.html`,
        renderScreenplayHtml(activeDoc).html,
        'text/html;charset=utf-8'
      );
      return;
    }
    const docTitle = escapeHtml(activeDoc.title.trim() || 'Untitled Manuscript');
    const opening = `<h1>${docTitle}</h1>`;
    const combinedBody =
      activeDoc.kind === 'essay' || !activeDoc.units
        ? activeDoc.contentHtml
        : activeDoc.units
            .map((u) => {
              const badge = getUnitBadgeLabel(u, activeDoc.units || []);
              const body = u.contentHtml;
              return `<section><h2>${escapeHtml(badge)}${
                u.title ? ` — ${escapeHtml(u.title)}` : ''
              }</h2>${body}</section>`;
            })
            .join('<hr />');

    const htmlDoc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${docTitle}</title>
  <style>
    body {
      font-family: Georgia, 'Iowan Old Style', serif;
      max-width: 65ch;
      margin: 4rem auto;
      padding: 0 1.5rem;
      line-height: 1.65;
      color: #111111;
      background: #F6F2EA;
    }
    h1 { font-size: 2.2rem; line-height: 1.15; margin-bottom: 1.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2.5rem; }
    blockquote { border-left: 2px solid #FF4B36; padding-left: 1rem; font-style: italic; color: #524B44; margin-left: 0; }
  </style>
</head>
<body>
  ${opening}
  ${combinedBody}
</body>
</html>`;
    downloadFile(
      `${slugifyFilename(activeDoc.title)}.html`,
      htmlDoc,
      'text/html;charset=utf-8'
    );
  };

  const handleCopyMarkdown = () => {
    const md = documentToFullMarkdown(activeDoc);
    navigator.clipboard?.writeText(md).catch(() => {});
  };

  const handleCopyPlainText = () => {
    const md = documentToFullMarkdown(activeDoc);
    navigator.clipboard?.writeText(md).catch(() => {});
  };

  const isMultiUnitWork =
    activeDoc.kind === 'book' || activeDoc.kind === 'screenplay';

  return (
    <div className="min-h-dvh w-full bg-[var(--bg-canvas)] text-[var(--ink-1)] selection:bg-[var(--selection-bg)]">
      <a
        href="#manuscript-title"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--bg-elevated)] focus:px-3 focus:py-2 focus:text-xs focus:font-medium focus:text-[var(--ink-1)]"
      >
        Skip to writing canvas
      </a>

      <TopBar
        isTyping={isTyping && viewMode === 'write'}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        workKind={activeDoc.kind}
        docTitle={activeDoc.title}
        activeUnitBadge={activeUnitBadge}
        viewMode={
          viewMode === 'cabinet'
            ? 'cabinet'
            : isMultiUnitWork
            ? viewMode
            : 'write'
        }
        onToggleViewMode={() =>
          setViewMode((v) => (v === 'birdseye' ? 'write' : 'birdseye'))
        }
        onToggleCabinetView={() =>
          setViewMode((v) => (v === 'cabinet' ? 'write' : 'cabinet'))
        }
        onOpenNewWorkModal={() => handleOpenNewWorkModal(undefined)}
        saveStatus={saveStatus}
        settings={settings}
        onUpdateSettings={updateSettings}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
        onExportHtml={handleExportHtml}
        onCopyMarkdown={handleCopyMarkdown}
        onCopyPlainText={handleCopyPlainText}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenScreenplayExport={
          activeDoc.kind === 'screenplay' ? () => setScreenplayExportOpen(true) : undefined
        }
        screenplayGuideOpen={screenplayGuideOpen}
        onToggleScreenplayGuide={() => {
          setViewMode('write');
          setScreenplayGuideOpen((v) => !v);
        }}
      />

      <SidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documents={documents}
        activeDocId={activeDoc.id}
        onSelectDoc={handleSelectDoc}
        onSelectDocUnit={handleSelectDocUnit}
        onOpenCabinetView={() => setViewMode('cabinet')}
        onOpenNewWorkModal={() => handleOpenNewWorkModal(undefined)}
        onTogglePin={handleTogglePin}
        onDuplicateDoc={handleDuplicateDoc}
        onDeleteDoc={handleDeleteDoc}
      />

      {viewMode === 'cabinet' ? (
        <ProjectCabinetView
          documents={documents}
          activeDocId={activeDoc.id}
          onSelectDocAndWrite={handleSelectDoc}
          onSelectDocBirdsEye={handleSelectDocBirdsEye}
          onOpenNewWorkModal={handleOpenNewWorkModal}
          onTogglePin={handleTogglePin}
          onDeleteDoc={handleDeleteDoc}
        />
      ) : isMultiUnitWork && viewMode === 'birdseye' ? (
        <BirdsEyeView
          doc={activeDoc}
          activeUnitId={activeUnit?.id || ''}
          onSelectUnitAndWrite={handleSelectUnitAndWrite}
          onUpdateDocTitle={(newTitle) =>
            updateActiveDocument((d) => ({ ...d, title: newTitle }))
          }
          onUpdateDocSubtitle={(newSubtitle) =>
            updateActiveDocument((d) => ({ ...d, subtitle: newSubtitle }))
          }
          onOpenTitlePage={
            activeDoc.kind === 'screenplay' ? () => setTitlePageOpen(true) : undefined
          }
          onAddUnit={(unitKind, partId, customLabel) =>
            handleAddUnit(unitKind, partId, customLabel, false)
          }
          onUpdateUnitMeta={handleUpdateUnitMeta}
          onMoveUnit={handleMoveUnit}
          onDeleteUnit={handleDeleteUnit}
          onAddPart={handleAddPart}
          onRenamePart={handleRenamePart}
          onDeletePart={handleDeletePart}
          onOpenProjectCabinet={() => setViewMode('cabinet')}
        />
      ) : (
        <RichEditor
          docId={activeDoc.id}
          workKind={activeDoc.kind}
          docTitle={activeDoc.title}
          unitId={activeUnit ? activeUnit.id : activeDoc.id}
          unitTitle={activeUnit ? activeUnit.title : activeDoc.title}
          unitSlugline={activeUnit?.slugline}
          initialHtml={
            activeUnit ? activeUnit.contentHtml : activeDoc.contentHtml
          }
          units={activeDoc.units}
          parts={activeDoc.parts}
          knownCharacters={knownCharacters}
          knownLocations={knownLocations}
          fontVoice={settings.fontVoice}
          fontSize={settings.fontSize}
          measure={settings.measure}
          focusMode={settings.focusMode}
          typewriterMode={settings.typewriterMode}
          sidebarOpen={sidebarOpen}
          isTyping={isTyping}
          onChangeTitle={handleEditorTitleChange}
          onChangeSlugline={handleEditorSluglineChange}
          onChangeHtml={handleEditorHtmlChange}
          onSelectUnit={handleSelectUnitAndWrite}
          onCreateNextUnit={() =>
            handleAddUnit(
              activeDoc.kind === 'screenplay' ? 'scene' : 'chapter',
              activeUnit?.partId,
              undefined,
              true
            )
          }
          onOpenBirdsEye={
            isMultiUnitWork ? () => setViewMode('birdseye') : undefined
          }
          onUserTyping={handleUserTyping}
          screenplayGuideOpen={screenplayGuideOpen}
          onCloseScreenplayGuide={() => setScreenplayGuideOpen(false)}
          onToggleScreenplayGuide={() => setScreenplayGuideOpen((v) => !v)}
          onOpenTitlePage={() => setTitlePageOpen(true)}
        />
      )}

      <BottomHud
        isTyping={isTyping && viewMode === 'write'}
        metrics={metrics}
        wordGoal={activeDoc.wordGoal || settings.wordGoal}
        onChangeWordGoal={(goal) => {
          updateSettings({ wordGoal: goal });
          updateActiveDocument((d) => ({ ...d, wordGoal: goal }));
        }}
      />

      <NewWorkModal
        open={newWorkModalOpen}
        defaultKind={newWorkDefaultKind}
        onClose={() => setNewWorkModalOpen(false)}
        onCreateWork={handleCreateWork}
      />

      {activeDoc.kind === 'screenplay' && (
        <ScreenplayExportDialog
          open={screenplayExportOpen}
          doc={activeDoc}
          onClose={closeScreenplayExport}
          onChangeSettings={(patch) =>
            updateActiveDocument((d) => ({
              ...d,
              screenplayExport: { ...d.screenplayExport, ...patch },
            }))
          }
          onLockDraft={(color) =>
            updateActiveDocument((d) => ({
              ...d,
              revisionBaseline: {
                lockedAt: Date.now(),
                color,
                units: snapshotSignatures(d),
              },
              // A freshly locked draft has nothing to mark yet; keep marks on
              screenplayExport: { ...d.screenplayExport, revisionMarks: true },
            }))
          }
          onDownload={handleExportHtml}
        />
      )}

      {activeDoc.kind === 'screenplay' && (
        <TitlePageDialog
          open={titlePageOpen}
          doc={activeDoc}
          onClose={closeTitlePage}
          onChangeTitle={(title) => updateActiveDocument((d) => ({ ...d, title }))}
          onChangeTitlePage={(patch) =>
            updateActiveDocument((d) => ({
              ...d,
              titlePage: { ...d.titlePage, ...patch },
            }))
          }
        />
      )}

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
};

export default App;
