import type { Note } from '../types';
import { INITIAL_DEFAULT_NOTE } from '../types';

const API_BASE = 'http://localhost:8000/api';
const LOCAL_STORAGE_KEY = 'slidescribe_local_notes_v1';

// In-browser fallback storage ensuring persistence across reload even without backend
function getLocalNotes(): Note[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = [INITIAL_DEFAULT_NOTE];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[notesApi] localStorage access error:', e);
    return [INITIAL_DEFAULT_NOTE];
  }
}

function saveLocalNotes(notes: Note[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('[notesApi] localStorage write error:', e);
  }
}

export const notesApi = {
  async fetchHealth(): Promise<{ status: string; database: string; mongodb_configured: boolean } | null> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
    } catch {
      // Backend not running or unreachable
    }
    return null;
  },

  async listNotes(): Promise<Note[]> {
    try {
      const res = await fetch(`${API_BASE}/notes`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const backendNotes: Note[] = await res.json();
        if (backendNotes.length > 0) {
          saveLocalNotes(backendNotes);
          return backendNotes;
        }
      }
    } catch {
      // fallback to localStorage
    }
    return getLocalNotes();
  },

  async getNote(noteId: string): Promise<Note | null> {
    try {
      const res = await fetch(`${API_BASE}/notes/${noteId}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const local = getLocalNotes();
    return local.find(n => n.id === noteId) || null;
  },

  async createNote(title: string = 'Untitled Note', workspace: string = 'General'): Promise<Note> {
    const payload = {
      title,
      content: '<h2>' + title + '</h2><p>Start typing lecture notes or import lecture materials...</p>',
      workspace,
      citations: []
    };

    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const created: Note = await res.json();
        const local = getLocalNotes();
        saveLocalNotes([created, ...local]);
        return created;
      }
    } catch {
      // fallback
    }

    const localNewNote: Note = {
      id: `note-${Date.now().toString(36)}`,
      title: payload.title,
      content: payload.content,
      workspace: payload.workspace,
      citations: [],
      updated_at: new Date().toISOString()
    };
    const current = getLocalNotes();
    saveLocalNotes([localNewNote, ...current]);
    return localNewNote;
  },

  async updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
    try {
      const res = await fetch(`${API_BASE}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const updated: Note = await res.json();
        const local = getLocalNotes().map(n => n.id === noteId ? updated : n);
        saveLocalNotes(local);
        return updated;
      }
    } catch {
      // fallback
    }

    const local = getLocalNotes();
    let updatedNote: Note | null = null;
    const modified = local.map(n => {
      if (n.id === noteId) {
        updatedNote = { ...n, ...updates, updated_at: new Date().toISOString() };
        return updatedNote;
      }
      return n;
    });

    if (!updatedNote) {
      updatedNote = {
        id: noteId,
        title: updates.title || 'Untitled Note',
        content: updates.content || '',
        workspace: updates.workspace || 'General',
        citations: updates.citations || [],
        updated_at: new Date().toISOString()
      };
      modified.unshift(updatedNote);
    }
    saveLocalNotes(modified);
    return updatedNote;
  },

  async processMaterials(
    files: File[],
    workspace: string = 'General',
    noteId?: string
  ): Promise<import('../types').ProcessingJob> {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    formData.append('workspace', workspace);
    if (noteId) {
      formData.append('note_id', noteId);
    }

    const res = await fetch(`${API_BASE}/process-materials`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000), // Allow time for real Faster-Whisper model inference
    });

    if (!res.ok) {
      let errorDetail = 'Failed to process lecture materials';
      try {
        const errorJson = await res.json();
        if (errorJson.detail) errorDetail = errorJson.detail;
      } catch {
        // fallback
      }
      throw new Error(errorDetail);
    }

    return await res.json();
  },

  async deleteNote(noteId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/notes/${noteId}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const local = getLocalNotes().filter(n => n.id !== noteId);
        saveLocalNotes(local);
        return true;
      }
    } catch {
      // fallback
    }
    const local = getLocalNotes().filter(n => n.id !== noteId);
    saveLocalNotes(local);
    return true;
  },

  async renameWorkspace(oldName: string, newName: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/workspaces/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName }),
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // fallback
    }
    const local = getLocalNotes().map(n => n.workspace === oldName ? { ...n, workspace: newName } : n);
    saveLocalNotes(local);
  },

  async deleteWorkspace(workspaceName: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/workspaces/${encodeURIComponent(workspaceName)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // fallback
    }
    const local = getLocalNotes().filter(n => n.workspace !== workspaceName);
    saveLocalNotes(local);
  },

  async getStudySet(
    noteId: string,
    forceRegenerate: boolean = false,
    options?: { depth?: string; custom_prompt?: string }
  ): Promise<import('../types').StudySet> {
    const url = `${API_BASE}/notes/${noteId}/study`;
    const res = await fetch(url, {
      method: forceRegenerate ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: forceRegenerate && options ? JSON.stringify(options) : undefined,
      signal: AbortSignal.timeout(75000), // Allow time for Gemma inference
    });

    if (!res.ok) {
      let errorDetail = 'Failed to load study materials';
      try {
        const errorJson = await res.json();
        if (errorJson.detail) errorDetail = errorJson.detail;
      } catch {
        // fallback
      }
      throw new Error(errorDetail);
    }

    return await res.json();
  }
};

