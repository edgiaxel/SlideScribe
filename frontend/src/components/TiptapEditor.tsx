import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export const TiptapEditor = ({
  content,
  onChange,
  editable = true,
}: TiptapEditorProps) => {
  const isInternalUpdateRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[320px] text-sm sm:text-base leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdateRef.current = true;
      onChange(editor.getHTML());
    },
  });

  // Keep editor content in sync when a different note is opened
  useEffect(() => {
    if (editor && !isInternalUpdateRef.current && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    isInternalUpdateRef.current = false;
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        Initializing rich text editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Editor Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 rounded-lg border text-xs"
        style={{
          backgroundColor: 'var(--bg-surface-low)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-black/15 dark:bg-white/20 font-bold'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-black/15 dark:bg-white/20 font-bold'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-black/15 dark:bg-white/20 font-bold'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-gray-300 dark:bg-stone-600 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors font-bold ${
              editor.isActive('bold')
                ? 'bg-black/15 dark:bg-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors italic ${
              editor.isActive('italic')
                ? 'bg-black/15 dark:bg-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-black/15 dark:bg-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-black/15 dark:bg-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Ordered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('blockquote')
                ? 'bg-black/15 dark:bg-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tiptap Content Canvas */}
      <div
        className="p-4 sm:p-5 rounded-lg border min-h-[340px] focus-within:ring-1 focus-within:ring-emerald-700/50"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
