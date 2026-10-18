import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Upload,
  GraduationCap,
  BookOpen,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Check
} from 'lucide-react';
import type { ViewMode, Note } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  notes: Note[];
  currentNoteId?: string;
  onNavigate: (view: ViewMode) => void;
  onOpenNote: (note: Note) => void;
  onCreateNewNote: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isOpen: boolean;
  onToggleCollapse: () => void;
  onRenameWorkspace?: (oldName: string, newName: string) => void;
  onDeleteWorkspace?: (workspaceName: string) => void;
  onRenameNote?: (noteId: string, newTitle: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

export const Sidebar = ({
  currentView,
  notes,
  currentNoteId,
  onNavigate,
  onOpenNote,
  onCreateNewNote,
  isDark,
  onToggleTheme,
  isOpen,
  onToggleCollapse,
  onRenameWorkspace,
  onDeleteWorkspace,
  onRenameNote,
  onDeleteNote,
}: SidebarProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'Business Analytics': true,
    'General': true,
  });

  // Three-dots menu state: { type: 'workspace' | 'note', id: string } | null
  const [activeMenu, setActiveMenu] = useState<{ type: 'workspace' | 'note'; id: string } | null>(null);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<{ type: 'workspace' | 'note'; id: string; currentName: string } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'workspace' | 'note'; id: string; name: string } | null>(null);

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileName, setProfileName] = useState(() => {
    return localStorage.getItem('slidescribe_profile_name') || 'Elena Vance';
  });
  const [profileRole, setProfileRole] = useState(() => {
    return localStorage.getItem('slidescribe_profile_role') || 'Graduate Student';
  });

  // Calculate initials from name
  const initials = profileName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'U';

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('slidescribe_profile_name', profileName);
    localStorage.setItem('slidescribe_profile_role', profileRole);
    setIsSettingsOpen(false);
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
    };
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  // Group notes dynamically by workspace
  const workspaceMap: Record<string, Note[]> = {};
  notes.forEach(note => {
    const ws = note.workspace || 'General';
    if (!workspaceMap[ws]) workspaceMap[ws] = [];
    workspaceMap[ws].push(note);
  });

  const handleOpenRename = (type: 'workspace' | 'note', id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    setRenameTarget({ type, id, currentName });
    setRenameInputValue(currentName);
  };

  const handleConfirmRename = () => {
    if (!renameTarget || !renameInputValue.trim()) return;
    if (renameTarget.type === 'workspace') {
      onRenameWorkspace?.(renameTarget.id, renameInputValue.trim());
    } else {
      onRenameNote?.(renameTarget.id, renameInputValue.trim());
    }
    setRenameTarget(null);
  };

  const handleOpenDelete = (type: 'workspace' | 'note', id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    setDeleteTarget({ type, id, name });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'workspace') {
      onDeleteWorkspace?.(deleteTarget.id);
    } else {
      onDeleteNote?.(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col justify-between transition-all duration-300 ease-in-out border-r border-black/10 dark:border-white/10 ${
          isOpen ? 'w-64' : 'w-16'
        }`}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
        }}
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto px-3 pt-4">
          {/* Brand */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-left group"
              title="SlideScribe Home"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-800/60 text-emerald-200 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-[#DCE7EC]" />
              </div>
              {isOpen && (
                <span className="font-serif text-lg font-semibold tracking-tight text-[#F3F1E8]">
                  SlideScribe
                </span>
              )}
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label="Toggle sidebar collapse"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* Quick Search */}
          {isOpen && (
            <div className="mb-3">
              <button
                onClick={() => onNavigate('home')}
                className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1.5 rounded-lg text-xs transition-colors border border-white/5"
              >
                <div className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-white/40" />
                  <span>Search notes...</span>
                </div>
                <kbd className="text-[10px] bg-white/10 text-white/60 px-1 py-0.5 rounded font-mono">
                  ⌘K
                </kbd>
              </button>
            </div>
          )}

          {/* New Note CTA */}
          <div className="mb-4">
            <button
              onClick={onCreateNewNote}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-xs shadow-sm transition-all ${
                isOpen ? 'px-3' : 'px-1'
              } bg-[#4A5C43] hover:bg-[#3D4D37] text-white`}
              title="Create New Note"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {isOpen && <span>New Note</span>}
            </button>
          </div>

          {/* Primary Route Navigation */}
          <nav className="flex flex-col gap-1 mb-6">
            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'home'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
              title="Home"
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              {isOpen && <span>Home</span>}
            </button>

            <button
              onClick={() => onNavigate('editor')}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'editor'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
              title="Note Editor"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              {isOpen && <span>Note Editor</span>}
            </button>

            <button
              onClick={() => onNavigate('import')}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'import'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
              title="Import Materials"
            >
              <Upload className="w-4 h-4 shrink-0" />
              {isOpen && <span>Import Materials</span>}
            </button>

            <button
              onClick={() => onNavigate('study')}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'study'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
              title="Study Deck"
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              {isOpen && <span>Study Tools</span>}
            </button>
          </nav>

          {/* Dynamic Workspace Folders */}
          {isOpen && (
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40">
                  Workspaces
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {Object.entries(workspaceMap).map(([wsName, wsNotes]) => {
                  const isExpanded = expandedFolders[wsName] ?? true;
                  const isWsMenuOpen = activeMenu?.type === 'workspace' && activeMenu?.id === wsName;

                  return (
                    <div key={wsName} className="flex flex-col relative">
                      {/* Workspace Header Row */}
                      <div className="group flex items-center justify-between w-full px-2 py-1.5 text-white/80 hover:bg-white/5 rounded-md text-xs transition-colors">
                        <button
                          onClick={() => toggleFolder(wsName)}
                          className="flex items-center gap-1.5 truncate flex-1 text-left"
                        >
                          {isExpanded ? (
                            <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-white/40 shrink-0" />
                          )}
                          <span className="truncate">{wsName}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Workspace Three-Dots Menu Button */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(isWsMenuOpen ? null : { type: 'workspace', id: wsName });
                              }}
                              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Workspace options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Workspace Context Menu */}
                            {isWsMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-xl z-50 py-1 text-xs"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  borderColor: 'var(--border-strong)',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <button
                                  onClick={(e) => handleOpenRename('workspace', wsName, wsName, e)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Rename Workspace</span>
                                </button>
                                <button
                                  onClick={(e) => handleOpenDelete('workspace', wsName, wsName, e)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Workspace</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => toggleFolder(wsName)}
                            className="p-0.5 text-white/40 hover:text-white"
                          >
                            <ChevronDown
                              className={`w-3 h-3 text-white/30 transition-transform ${
                                isExpanded ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Notes in Workspace */}
                      {isExpanded && (
                        <div className="pl-6 pr-1 py-0.5 flex flex-col gap-0.5 border-l border-white/5 ml-3 my-0.5">
                          {wsNotes.map((n) => {
                            const isNoteMenuOpen = activeMenu?.type === 'note' && activeMenu?.id === n.id;
                            const isCurrent = currentView === 'editor' && currentNoteId === n.id;

                            return (
                              <div
                                key={n.id}
                                className={`group flex items-center justify-between px-2 py-1 rounded text-xs transition-colors relative ${
                                  isCurrent
                                    ? 'bg-white/20 text-white font-semibold'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <button
                                  onClick={() => onOpenNote(n)}
                                  className="truncate flex-1 text-left"
                                  title={n.title}
                                >
                                  {n.title}
                                </button>

                                {/* Note Three-Dots Button */}
                                <div className="relative shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenu(isNoteMenuOpen ? null : { type: 'note', id: n.id });
                                    }}
                                    className="p-0.5 rounded text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Note options"
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </button>

                                  {/* Note Context Menu */}
                                  {isNoteMenuOpen && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 top-full mt-1 w-36 rounded-lg border shadow-xl z-50 py-1 text-xs"
                                      style={{
                                        backgroundColor: 'var(--bg-surface)',
                                        borderColor: 'var(--border-strong)',
                                        color: 'var(--text-main)',
                                      }}
                                    >
                                      <button
                                        onClick={(e) => handleOpenRename('note', n.id, n.title, e)}
                                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Rename</span>
                                      </button>
                                      <button
                                        onClick={(e) => handleOpenDelete('note', n.id, n.title, e)}
                                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer & User Profile */}
        <div className="p-3 bg-black/20 border-t border-white/5 flex flex-col gap-2">
          {/* Settings Trigger Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
            title="Settings"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {isOpen && <span>Settings</span>}
          </button>

          {/* Profile Card & Theme Switcher */}
          <div className="flex items-center justify-between pt-1">
            <div
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 min-w-0 cursor-pointer group"
              title="Click to edit profile"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-medium text-xs flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-emerald-400 transition-all">
                {initials}
              </div>
              {isOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-white truncate group-hover:underline">
                    {profileName}
                  </span>
                  <span className="text-[10px] text-white/40 truncate">
                    {profileRole}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme mode"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* RENAME MODAL */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-serif font-semibold text-lg">
                Rename {renameTarget.type === 'workspace' ? 'Workspace' : 'Note'}
              </h3>
              <button
                onClick={() => setRenameTarget(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-500">
                {renameTarget.type === 'workspace' ? 'Workspace Name' : 'Note Title'}
              </label>
              <input
                type="text"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename();
                  if (e.key === 'Escape') setRenameTarget(null);
                }}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#4A5C43] hover:bg-[#3d4d37] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-serif font-semibold text-lg text-red-600 dark:text-red-400">
                Delete {deleteTarget.type === 'workspace' ? 'Workspace' : 'Note'}?
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {deleteTarget.type === 'workspace' ? (
                <>
                  Are you sure you want to delete the workspace{' '}
                  <strong className="text-gray-800 dark:text-gray-200">"{deleteTarget.name}"</strong>? All notes inside this workspace will be permanently deleted.
                </>
              ) : (
                <>
                  Are you sure you want to delete note{' '}
                  <strong className="text-gray-800 dark:text-gray-200">"{deleteTarget.name}"</strong>? This action cannot be undone.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete {deleteTarget.type === 'workspace' ? 'Workspace & Notes' : 'Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS POP-UP MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveSettings}
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif font-semibold text-lg">Settings & Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-700 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{profileName}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {profileRole}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Elena Vance"
                  required
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  style={{
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                  Role / Description
                </label>
                <input
                  type="text"
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  placeholder="e.g. Graduate Student, Business Analytics"
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  style={{
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#4A5C43] hover:bg-[#3d4d37] transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
