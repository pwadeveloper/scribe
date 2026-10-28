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
} from './storage';
import {
  computeDocumentTotalMetrics,
  documentToFullMarkdown,
  downloadFile,
  extractPlainText,
  extractScreenplayCharacters,
  extractScreenplayLocations,
  getUnitBadgeLabel,
  slugifyFilename,
} from './editorUtils';
import { TopBar } from './components/TopBar';
import { SidebarDrawer } from './components/SidebarDrawer';
import { RichEditor } from './components/RichEditor';
import { BirdsEyeView } from './components/BirdsEyeView';
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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
        paper: '#FAF7F2',
        sepia: '#F3ECE0',
        night: '#141312',
      };
      metaTheme.setAttribute('content', themeColors[settings.theme] || '#FAF7F2');
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
      options?: { includeParts?: boolean }
    ) => {
      const newDoc = createNewWorkItem(kind, title, options);
      setDocuments((prev) => {
        const next = [newDoc, ...prev];
        persistDocs(next);
        return next;
      });
      setActiveDocId(newDoc.id);
      saveActiveDocIdSync(newDoc.id);
      setViewMode('write');
      setSidebarOpen(false);
      setIsTyping(false);
    },
    [persistDocs]
  );

  const handleSelectDoc = useCallback((id: string) => {
    setActiveDocId(id);
    saveActiveDocIdSync(id);
    setViewMode('write');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
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
      if (e.key === 'Escape') {
        setIsTyping(false);
        if (sidebarOpen) setSidebarOpen(false);
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();
      if (key === 'm') {
        if (activeDoc.kind === 'book' || activeDoc.kind === 'screenplay') {
          e.preventDefault();
          setViewMode((v) => (v === 'birdseye' ? 'write' : 'birdseye'));
          setIsTyping(false);
        }
      } else if (key === 'd') {
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
    const md = documentToFullMarkdown(activeDoc);
    const body = extractPlainText(md);
    downloadFile(
      `${slugifyFilename(activeDoc.title)}.txt`,
      `${body}\n`,
      'text/plain;charset=utf-8'
    );
  };

  const handleExportHtml = () => {
    const docTitle = activeDoc.title.trim() || 'Untitled Manuscript';
    const combinedBody =
      activeDoc.kind === 'essay' || !activeDoc.units
        ? activeDoc.contentHtml
        : activeDoc.units
            .map((u) => {
              const badge = getUnitBadgeLabel(u, activeDoc.units || []);
              return `<section><h2>${badge}${
                u.title ? ` — ${u.title}` : ''
              }</h2>${u.contentHtml}</section>`;
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
      color: #1C1917;
      background: #FAF7F2;
    }
    h1 { font-size: 2.2rem; line-height: 1.15; margin-bottom: 1.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2.5rem; }
    blockquote { border-left: 2px solid #9A4B26; padding-left: 1rem; font-style: italic; color: #524B44; margin-left: 0; }
    p[data-sp-type="slugline"] { font-weight: bold; text-transform: uppercase; margin-top: 2rem; }
    p[data-sp-type="character"] { font-weight: bold; text-transform: uppercase; margin-left: 30%; margin-bottom: 0; }
    p[data-sp-type="parenthetical"] { font-style: italic; margin-left: 24%; margin-top: 0; margin-bottom: 0; }
    p[data-sp-type="dialogue"] { margin-left: 15%; margin-right: 15%; margin-top: 0.15rem; }
    p[data-sp-type="transition"] { text-align: right; font-weight: bold; text-transform: uppercase; }
  </style>
</head>
<body>
  <h1>${docTitle}</h1>
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
        viewMode={isMultiUnitWork ? viewMode : 'write'}
        onToggleViewMode={() =>
          setViewMode((v) => (v === 'birdseye' ? 'write' : 'birdseye'))
        }
        onOpenNewWorkModal={() => setNewWorkModalOpen(true)}
        saveStatus={saveStatus}
        settings={settings}
        onUpdateSettings={updateSettings}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
        onExportHtml={handleExportHtml}
        onCopyMarkdown={handleCopyMarkdown}
        onCopyPlainText={handleCopyPlainText}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <SidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documents={documents}
        activeDocId={activeDoc.id}
        onSelectDoc={handleSelectDoc}
        onOpenNewWorkModal={() => setNewWorkModalOpen(true)}
        onTogglePin={handleTogglePin}
        onDuplicateDoc={handleDuplicateDoc}
        onDeleteDoc={handleDeleteDoc}
      />

      {isMultiUnitWork && viewMode === 'birdseye' ? (
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
          onAddUnit={(unitKind, partId, customLabel) =>
            handleAddUnit(unitKind, partId, customLabel, false)
          }
          onUpdateUnitMeta={handleUpdateUnitMeta}
          onMoveUnit={handleMoveUnit}
          onDeleteUnit={handleDeleteUnit}
          onAddPart={handleAddPart}
          onRenamePart={handleRenamePart}
          onDeletePart={handleDeletePart}
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
        onClose={() => setNewWorkModalOpen(false)}
        onCreateWork={handleCreateWork}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
};

export default App;
