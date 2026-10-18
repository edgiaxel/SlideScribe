import { useState } from 'react';
import {
  Upload,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Search,
  Plus
} from 'lucide-react';
import type { Note, ViewMode } from '../types';

interface HomeViewProps {
  notes: Note[];
  onNavigate: (view: ViewMode) => void;
  onOpenNote: (note: Note) => void;
  onCreateNewNote: () => void;
}

export const HomeView = ({
  notes,
  onNavigate,
  onOpenNote,
  onCreateNewNote,
}: HomeViewProps) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    n.workspace.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
      {/* Editorial Welcome Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex flex-col gap-1">
          <span
            className="text-xs uppercase font-semibold tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Workspace Home · Fall Term
          </span>
          <h1
            className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight"
            style={{ color: 'var(--text-main)' }}
          >
            Good afternoon, Elena
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Select an action or review your lecture notes with source links.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('import')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border shadow-xs transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
          >
            <Upload className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Upload Lecture</span>
          </button>

          <button
            onClick={onCreateNewNote}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white shadow-xs transition-colors bg-[#324B55] hover:bg-[#253941]"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Action Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Action 1: Write / Edit */}
        <div
          onClick={onCreateNewNote}
          className="group p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-sm"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#DCE7EC] text-[#324B55]">
              <Plus className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2
                className="text-sm font-semibold group-hover:text-[#324B55] dark:group-hover:text-emerald-400 transition-colors"
                style={{ color: 'var(--text-main)' }}
              >
                Create New Note
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Start a fresh rich-text document with Markdown formatting and margin citations.
              </p>
            </div>
          </div>
          <div
            className="mt-4 pt-3 border-t flex items-center text-xs font-semibold text-[#324B55] dark:text-emerald-400"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span>Create blank note</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Action 2: Import Slides & Decks */}
        <div
          onClick={() => onNavigate('import')}
          className="group p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-sm"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#DCE8D6] text-[#4A5C43]">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2
                className="text-sm font-semibold group-hover:text-[#4A5C43] dark:group-hover:text-emerald-400 transition-colors"
                style={{ color: 'var(--text-main)' }}
              >
                Import Materials
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Upload slide presentations (PDF, PPTX) and recordings for structured extraction.
              </p>
            </div>
          </div>
          <div
            className="mt-4 pt-3 border-t flex items-center text-xs font-semibold text-[#4A5C43] dark:text-emerald-400"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span>Drop presentation files</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Action 3: Study Tools */}
        <div
          onClick={() => onNavigate('study')}
          className="group p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-sm"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#F0E0D5] text-[#683C2F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2
                className="text-sm font-semibold group-hover:text-[#683C2F] dark:group-hover:text-amber-400 transition-colors"
                style={{ color: 'var(--text-main)' }}
              >
                Practice & Quiz
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Review interactive quizzes and flashcards grounded directly in saved notes.
              </p>
            </div>
          </div>
          <div
            className="mt-4 pt-3 border-t flex items-center text-xs font-semibold text-[#683C2F] dark:text-amber-400"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span>Start review deck</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* Main Content Split: Notes Library */}
      <div className="flex flex-col gap-4">
        <div
          className="flex items-center justify-between pb-2 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text-main)' }}>
              Saved Lecture Notes
            </h2>
            <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
              ({filteredNotes.length} available)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter notes..."
                className="pl-8 pr-3 py-1 text-xs rounded-md border bg-transparent focus:outline-none"
                style={{ borderColor: 'var(--border-strong)' }}
              />
            </div>
          </div>
        </div>

        {/* Note Cards Grid */}
        {filteredNotes.length === 0 ? (
          <div
            className="p-8 rounded-xl border text-center text-xs"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            No notes found. Click "New Note" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const previewText = note.content
                .replace(/<[^>]*>/g, ' ')
                .slice(0, 140);
              const wordCount = note.content
                .replace(/<[^>]*>/g, ' ')
                .split(/\s+/)
                .filter(Boolean).length;

              return (
                <article
                  key={note.id}
                  onClick={() => onOpenNote(note)}
                  className="group p-5 rounded-xl border flex flex-col justify-between gap-3 hover:border-gray-400 dark:hover:border-gray-600 transition-all cursor-pointer shadow-2xs relative"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className="px-2 py-0.5 rounded font-medium text-[11px] bg-[#EAE5DB] dark:bg-stone-800"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {note.workspace || 'General'}
                      </span>
                      <span
                        className="flex items-center gap-1 text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Clock className="w-3 h-3" />
                        {note.updated_at
                          ? new Date(note.updated_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>

                    <h3
                      className="text-base font-serif font-semibold group-hover:text-[#324B55] dark:group-hover:text-emerald-300 transition-colors truncate"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {note.title}
                    </h3>

                    <p
                      className="text-xs line-clamp-3 leading-relaxed"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {previewText}...
                    </p>
                  </div>

                  <div
                    className="pt-3 border-t flex items-center justify-between text-xs"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {wordCount} words
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#DCE8D6] dark:bg-emerald-950 text-[#33452F] dark:text-emerald-300">
                      {note.citations?.length || 0} citations
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
