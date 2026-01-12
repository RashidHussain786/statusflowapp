'use client';

import { useState, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Bold, Italic, List, ListOrdered, Strikethrough, Underline } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import OrderedList from '@tiptap/extension-ordered-list';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export interface EditorRef {
  getText: () => string;
}

export const RichTextEditor = forwardRef<EditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = "Enter your status update...",
  maxLength = 600
}, ref) => {
  // Note: Editor starts empty to avoid HTML parsing issues

  // Memoize the onUpdate callback to prevent unnecessary re-renders
  const handleUpdate = useCallback(({ editor }: any) => {
    // Defer the state update to avoid calling setState during render
    setTimeout(() => {
      const html = editor.getHTML();
      onChange(html);
    }, 0);
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      UnderlineExtension,
      OrderedList,
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && !editor.isDestroyed && value) {
      // Set content whenever value changes (not just when editor is empty)
      const currentContent = editor.getHTML();
      if (currentContent !== value) {
        editor.commands.setContent(value);
      }
    }
  }, [editor, value]);

  // Expose getText method via ref
  useImperativeHandle(ref, () => ({
    getText: () => editor?.getText() || ''
  }), [editor]);


  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-3 border border-input rounded-t-lg bg-muted/50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-md transition-colors ${editor.isActive('bold')
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-md transition-colors ${editor.isActive('italic')
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded-md transition-colors ${editor.isActive('strike')
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded-md transition-colors ${editor.isActive('underline')
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-md transition-colors ${editor.isActive('bulletList')
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-md transition-colors ${editor.isActive('orderedList')
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="ml-auto text-xs text-muted-foreground font-medium">
          {editor?.getText().length || 0}/{maxLength}
        </div>
      </div>

      {/* Editor Area */}
      <div className="border-x border-b border-input rounded-b-lg overflow-hidden">
        <EditorContent
          editor={editor}
          className="min-h-[300px] max-h-[600px] overflow-y-auto"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          WYSIWYG rich text editor with HTML formatting.
        </p>
        {(editor?.getText().length || 0) > maxLength * 0.8 && (
          <p className={`text-xs font-medium ${(editor?.getText().length || 0) > maxLength ? 'text-destructive' : 'text-amber-600'}`}>
            {maxLength - (editor?.getText().length || 0)} characters remaining
          </p>
        )}
      </div>
    </div>
  );
});