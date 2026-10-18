import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { NoteEditorView } from './components/NoteEditorView';
import { ImportMaterialsView } from './components/ImportMaterialsView';
import { StudyView } from './components/StudyView';
import type { ViewMode, Note } from './types';
import { INITIAL_DEFAULT_NOTE } from './types';
import { notesApi } from './api/notesApi';
import { Menu } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([INITIAL_DEFAULT_NOTE]);
  const [activeNote, setActiveNote] = useState<Note>(INITIAL_DEFAULT_NOTE);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  // Sync theme class on document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load notes on mount
  useEffect(() => {
    async function loadInitialNotes() {
      setIsLoadingNotes(true);
      const loaded = await notesApi.listNotes();
      if (loaded.length > 0) {
        setNotes(loaded);
        setActiveNote(loaded[0]);
      }
      setIsLoadingNotes(false);
    }
    loadInitialNotes();
  }, []);

  const toggleTheme = () => setIsDark(prev => !prev);
  const toggleCollapse = () => setIsSidebarOpen(prev => !prev);

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenNote = (note: Note) => {
    setActiveNote(note);
    setCurrentView('editor');
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateNewNote = async () => {
    const newNote = await notesApi.createNote('Untitled Lecture Note', 'Business Analytics');
    setNotes(prev => [newNote, ...prev.filter(n => n.id !== newNote.id)]);
    setActiveNote(newNote);
    setCurrentView('editor');
    setIsMobileMenuOpen(false);
  };

  const handleNoteUpdated = useCallback((updatedNote: Note) => {
    setNotes(prev =>
      prev.map(n => (n.id === updatedNote.id ? updatedNote : n))
    );
    setActiveNote(updatedNote);
  }, []);

  const handleRenameWorkspace = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    await notesApi.renameWorkspace(oldName, newName);
    setNotes(prev => prev.map(n => n.workspace === oldName ? { ...n, workspace: newName } : n));
    if (activeNote.workspace === oldName) {
      setActiveNote(prev => ({ ...prev, workspace: newName }));
    }
  };

  const handleDeleteWorkspace = async (workspaceName: string) => {
    await notesApi.deleteWorkspace(workspaceName);
    setNotes(prev => {
      const remaining = prev.filter(n => n.workspace !== workspaceName);
      if (activeNote.workspace === workspaceName) {
        if (remaining.length > 0) {
          setActiveNote(remaining[0]);
        } else {
          setActiveNote(INITIAL_DEFAULT_NOTE);
        }
      }
      return remaining;
    });
  };

  const handleRenameNote = async (noteId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updated = await notesApi.updateNote(noteId, { title: newTitle });
    handleNoteUpdated(updated);
  };

  const handleDeleteNote = async (noteId: string) => {
    await notesApi.deleteNote(noteId);
    setNotes(prev => {
      const remaining = prev.filter(n => n.id !== noteId);
      if (activeNote.id === noteId) {
        if (remaining.length > 0) {
          setActiveNote(remaining[0]);
        } else {
          setActiveNote(INITIAL_DEFAULT_NOTE);
        }
      }
      return remaining;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-main)]">
      {/* Mobile Top App Bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-50 backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg border text-gray-700 dark:text-gray-200"
          style={{ borderColor: 'var(--border-strong)' }}
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="font-serif font-semibold text-base tracking-tight">
          SlideScribe
        </span>

        <span className="text-xs uppercase font-medium px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
          {currentView}
        </span>
      </div>

      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          currentView={currentView}
          notes={notes}
          currentNoteId={activeNote?.id}
          onNavigate={handleNavigate}
          onOpenNote={handleOpenNote}
          onCreateNewNote={handleCreateNewNote}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          isOpen={isSidebarOpen}
          onToggleCollapse={toggleCollapse}
          onRenameWorkspace={handleRenameWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onRenameNote={handleRenameNote}
          onDeleteNote={handleDeleteNote}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80%] h-full">
            <Sidebar
              currentView={currentView}
              notes={notes}
              currentNoteId={activeNote?.id}
              onNavigate={handleNavigate}
              onOpenNote={handleOpenNote}
              onCreateNewNote={handleCreateNewNote}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              isOpen={true}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
              onRenameWorkspace={handleRenameWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
              onRenameNote={handleRenameNote}
              onDeleteNote={handleDeleteNote}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'md:pl-64' : 'md:pl-16'
        }`}
      >
        {isLoadingNotes ? (
          <div className="w-full h-96 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Loading workspace notes...
          </div>
        ) : (
          <>
            {currentView === 'home' && (
              <HomeView
                notes={notes}
                onNavigate={handleNavigate}
                onOpenNote={handleOpenNote}
                onCreateNewNote={handleCreateNewNote}
              />
            )}
            {currentView === 'editor' && (
              <NoteEditorView
                note={activeNote}
                onNavigate={handleNavigate}
                onNoteUpdated={handleNoteUpdated}
              />
            )}
            {currentView === 'import' && (
              <ImportMaterialsView
                onNavigate={handleNavigate}
                onNoteCreated={(newNote) => {
                  setNotes((prev) => [newNote, ...prev.filter((n) => n.id !== newNote.id)]);
                  setActiveNote(newNote);
                  setCurrentView('editor');
                }}
              />
            )}
            {currentView === 'study' && (
              <StudyView
                note={activeNote}
                notes={notes}
                onNavigate={handleNavigate}
                onSelectNote={(selected) => setActiveNote(selected)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
