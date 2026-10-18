import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Paperclip,
  ChevronRight,
  Mic,
  Play,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';
import type { ViewMode, Note } from '../types';
import { TiptapEditor } from './TiptapEditor';
import { notesApi } from '../api/notesApi';

interface NoteEditorViewProps {
  note: Note;
  onNavigate: (view: ViewMode) => void;
  onNoteUpdated: (updatedNote: Note) => void;
}

export const NoteEditorView = ({
  note,
  onNavigate,
  onNoteUpdated,
}: NoteEditorViewProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [showSources, setShowSources] = useState(true);
  const citations = note.citations || [];
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(
    citations.length > 0 ? citations[0].id : null
  );

  // Autosave states: 'saved' | 'saving' | 'error'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    navigator.clipboard.writeText(`${title}\n\n${plainText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const debounceTimerRef = useRef<number | null>(null);

  // Sync internal state if a different note is selected
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSaveStatus('saved');
    setSelectedCitationId(note.citations && note.citations.length > 0 ? note.citations[0].id : null);
  }, [note.id]);

  const performSave = useCallback(
    async (newTitle: string, newContent: string) => {
      setSaveStatus('saving');
      try {
        const saved = await notesApi.updateNote(note.id, {
          title: newTitle,
          content: newContent,
        });
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        onNoteUpdated(saved);
      } catch (err) {
        console.error('Failed to autosave note:', err);
        setSaveStatus('error');
      }
    },
    [note.id, onNoteUpdated]
  );

  const triggerAutosave = (newTitle: string, newContent: string) => {
    setSaveStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performSave(newTitle, newContent);
    }, 800);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutosave(newTitle, content);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    triggerAutosave(title, newContent);
  };

  // Word count estimate
  const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Top Header & Breadcrumb */}
      <header
        className="sticky top-0 z-30 h-14 border-b px-4 sm:px-6 flex items-center justify-between gap-4 backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => onNavigate('home')}
            className="hover:underline transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {note.workspace || 'General'}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold truncate max-w-[180px] sm:max-w-xs" style={{ color: 'var(--text-main)' }}>
            {title}
          </span>
          <span className="text-gray-400">·</span>

          {/* Autosave Status Indicator */}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved ({lastSavedTime})</span>
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Save error (retrying...)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-2xs hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
            title="Copy note text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('study')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-2xs"
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Study Mode</span>
          </button>

          <button
            onClick={() => setShowSources(!showSources)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showSources
                ? 'bg-[#DCE8D6] text-[#33452F] border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                : 'hover:bg-gray-100 dark:hover:bg-stone-800'
            }`}
            style={
              !showSources
                ? {
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-main)',
                  }
                : undefined
            }
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Sources ({citations.length})</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area: Editor + Sources Drawer */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* Editor Main Document */}
        <article
          className="flex-1 max-w-3xl w-full rounded-xl border p-6 sm:p-8 shadow-2xs flex flex-col gap-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Note Title & Metadata Header */}
          <div className="flex flex-col gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase"
                  style={{
                    backgroundColor: 'var(--bg-surface-high)',
                    color: 'var(--text-main)',
                  }}
                >
                  {note.workspace || 'General'}
                </span>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-gray-400" />
                  <span>{Math.max(1, Math.ceil(wordCount / 180))} min read</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>{wordCount} words</span>
                <span className="text-gray-300">·</span>
                <span>{citations.length} citations</span>
              </div>
            </div>

            {/* Editable Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Note title..."
              className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight bg-transparent border-none focus:outline-none w-full"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* Quick In-text Source Shortcuts Strip */}
          <div
            className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border text-xs"
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <span className="font-semibold text-emerald-800 dark:text-emerald-400">
              Source Highlights:
            </span>
            {citations.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                No verified source citations attached (unverified or manual note)
              </span>
            ) : (
              citations.map((c) => {
                const isSelected = selectedCitationId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCitationId(c.id);
                      if (!showSources) setShowSources(true);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                      c.type === 'slide'
                        ? isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-[#DCE8D6] text-[#33452F] border-emerald-400/40 hover:bg-[#cde0c5]'
                        : isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-[#F0E0D5] text-[#683C2F] border-amber-300/40 hover:bg-[#e6d0c2]'
                    }`}
                    title={`${c.source_title}: ${c.reference_label}`}
                  >
                    {c.type === 'slide' ? (
                      <FileText className="w-3 h-3" />
                    ) : (
                      <Mic className="w-3 h-3" />
                    )}
                    <span>{c.reference_label}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Tiptap Rich Text Editor */}
          <TiptapEditor content={content} onChange={handleContentChange} />
        </article>

        {/* Sources Drawer / Side Panel */}
        {showSources && (
          <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
            <div
              className="border rounded-xl p-4 flex items-center justify-between"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#4A5C43]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                  Source References
                </h3>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-surface-high)',
                  color: 'var(--text-main)',
                }}
              >
                {citations.length} Grounded
              </span>
            </div>

            {citations.length === 0 ? (
              <div
                className="border rounded-xl p-5 flex flex-col gap-3 text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Unverified Sources</span>
                </div>
                <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  This note does not have verified slide pages or audio timestamps attached. Content without verified citations cannot be traced back to original lecture materials.
                </p>
                <button
                  onClick={() => onNavigate('import')}
                  className="mt-1 w-full py-2 rounded-lg text-xs font-semibold text-white bg-[#4A5C43] hover:bg-[#3d4d37] transition-colors"
                >
                  Import Grounding Materials
                </button>
              </div>
            ) : (
              citations.map((c) => {
                const isSelected = selectedCitationId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCitationId(c.id)}
                    className={`border rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? c.type === 'slide'
                          ? 'ring-2 ring-emerald-600 shadow-xs'
                          : 'ring-2 ring-amber-600 shadow-xs'
                        : 'hover:border-emerald-600/40'
                    }`}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`p-1.5 rounded ${
                            c.type === 'slide'
                              ? 'bg-[#DCE8D6] text-[#4A5C43]'
                              : 'bg-[#F0E0D5] text-[#683C2F]'
                          }`}
                        >
                          {c.type === 'slide' ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                            {c.source_title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                              {c.reference_label}
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {c.type === 'slide' ? (
                      <div
                        className="w-full rounded-lg border p-3 flex flex-col gap-2 text-xs"
                        style={{
                          backgroundColor: 'var(--bg-surface-low)',
                          borderColor: 'var(--border-strong)',
                        }}
                      >
                        <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400">
                          <span>{c.reference_label.toUpperCase()}</span>
                          <span className="text-emerald-700 dark:text-emerald-400">GROUNDED CONTENT</span>
                        </div>
                        <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: 'var(--text-muted)' }}>
                          {c.details || 'Slide page text extracted and indexed.'}
                        </p>
                      </div>
                    ) : (
                      <div
                        className="p-3 rounded-lg border space-y-2 text-xs"
                        style={{
                          backgroundColor: 'var(--bg-surface-low)',
                          borderColor: 'var(--border-strong)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            className="w-6 h-6 rounded-full bg-[#683C2F] text-white flex items-center justify-center hover:bg-[#522f25] transition-colors shrink-0"
                            title="Play audio snippet"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Play className="w-3 h-3 ml-0.5" />
                          </button>
                          <div className="flex-1 flex items-center gap-0.5 h-4">
                            <div className="w-1 h-2 bg-amber-600 rounded-full" />
                            <div className="w-1 h-3 bg-amber-600 rounded-full" />
                            <div className="w-1 h-4 bg-amber-600 rounded-full" />
                            <div className="w-1 h-2 bg-amber-600 rounded-full" />
                            <div className="w-1 h-3 bg-gray-400 rounded-full" />
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          </div>
                          <span className="text-[11px] font-mono text-gray-500">
                            {c.reference_label}
                          </span>
                        </div>
                        <p
                          className="text-xs italic border-l-2 pl-2 border-amber-600/40 leading-snug line-clamp-4"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          “{c.details || 'Audio transcript segment extracted.'}”
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
