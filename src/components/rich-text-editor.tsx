'use client';

import { useCallback, useEffect, forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Strikethrough, Underline, Tag } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import OrderedList from '@tiptap/extension-ordered-list';
import { STATUS_TAGS } from '@/lib/tags';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currentUrlLength?: number;
  urlCount?: number;
  showTagsToggle?: boolean;
  showTags?: boolean;
  onShowTagsChange?: (show: boolean) => void;
}

export interface EditorRef {
  getText: () => string;
}

export const RichTextEditor = forwardRef<EditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = "Enter your status update...",
  currentUrlLength,
  urlCount = 1,
  showTagsToggle = false,
  showTags = false,
  onShowTagsChange
}, ref) => {
  const [showTagSelector, setShowTagSelector] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const handleUpdate = useCallback(({ editor }: any) => {
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

  useEffect(() => {
    if (editor && !editor.isDestroyed && value) {
      const currentContent = editor.getHTML();
      if (currentContent !== value) {
        editor.commands.setContent(value);
      }
    }
  }, [editor, value]);

  useImperativeHandle(ref, () => ({
    getText: () => editor?.getText() || ''
  }), [editor]);

  const insertTag = useCallback((tagLabel: string) => {
    editor?.chain().focus().insertContent(`[${tagLabel}] `).run();
    setShowTagSelector(false);
  }, [editor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-3">
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
        <div className="relative" ref={tagDropdownRef}>
          <button
            type="button"
            onClick={() => setShowTagSelector(!showTagSelector)}
            className={`p-2 rounded-md transition-colors ${showTagSelector
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            title="Insert status tag"
          >
            <Tag className="h-4 w-4" />
          </button>

          {showTagSelector && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto min-w-32">
              {STATUS_TAGS.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => insertTag(tag.label)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <span
                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
                    style={{
                      backgroundColor: tag.bgColor,
                      color: tag.color,
                      border: `1px solid ${tag.color}20`
                    }}
                  >
                    {tag.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {showTagsToggle && (
          <div className="flex items-center gap-2 ml-2">
            <label className="flex items-center gap-1 cursor-pointer text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showTags}
                onChange={(e) => onShowTagsChange?.(e.target.checked)}
                className="text-primary focus:ring-primary border-input w-3 h-3"
              />
              <span>Show Tags</span>
            </label>
          </div>
        )}

        <div className="ml-auto text-xs text-muted-foreground font-medium">
          {currentUrlLength !== undefined ? (
            urlCount > 1 ? (
              <span className="text-blue-600">
                {urlCount} URLs: {currentUrlLength}/{urlCount * 1800}
              </span>
            ) : (
              <span className={currentUrlLength > 1600 ? 'text-amber-600' : ''}>
                URL: {currentUrlLength}/1800
              </span>
            )
          ) : (
            `${editor?.getHTML().length || 0} chars (HTML)`
          )}
        </div>
      </div>


      <div className="border-x border-b border-input rounded-b-lg overflow-hidden">
        <EditorContent
          editor={editor}
          className="min-h-[300px] max-h-[600px] overflow-y-auto"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          WYSIWYG rich text editor with HTML formatting.
        </p>
      </div>
    </div>
  );
});