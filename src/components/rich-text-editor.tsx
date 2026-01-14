'use client';

import { useCallback, useEffect, forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Strikethrough, Underline, Tag, Plus, X } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import OrderedList from '@tiptap/extension-ordered-list';
import { STATUS_TAGS, getAllTags, addCustomTag, isTagLabelTaken, removeCustomTag } from '@/lib/tags';
import { VisualTagsExtension } from '@/lib/visual-tags-plugin';
import { TextColor, TextHighlight } from '@/lib/text-styling-extensions';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currentUrlLength?: number;
  urlCount?: number;
  showTagsToggle?: boolean;
  showTags?: boolean;
  onShowTagsChange?: (show: boolean) => void;
  enableTextStyling?: boolean;
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
  showTags = true,
  onShowTagsChange,
  enableTextStyling = false,
}, ref) => {
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [tagUpdateTrigger, setTagUpdateTrigger] = useState(0);
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
      VisualTagsExtension,
      ...(enableTextStyling ? [TextColor, TextHighlight] : []),
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  }, [enableTextStyling]);

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

  const handleCreateTag = useCallback(() => {
    if (!newTagLabel.trim()) return;

    if (isTagLabelTaken(newTagLabel.trim())) {
      alert('A tag with this label already exists!');
      return;
    }

    try {
      const newTag = addCustomTag(newTagLabel.trim(), newTagColor);
      insertTag(newTag.label);
      setNewTagLabel('');
      setNewTagColor('#3b82f6');
      setShowCreateTag(false);
      setTagUpdateTrigger(prev => prev + 1); // Trigger re-render
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag. Please try again.');
    }
  }, [newTagLabel, newTagColor, insertTag]);

  const handleDeleteTag = useCallback((tagId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the insert tag action

    if (confirm('Are you sure you want to delete this custom tag?')) {
      try {
        removeCustomTag(tagId);
        setTagUpdateTrigger(prev => prev + 1); // Trigger re-render
      } catch (error) {
        console.error('Failed to delete tag:', error);
        alert('Failed to delete tag. Please try again.');
      }
    }
  }, []);

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
    <div className={`space-y-3 ${!showTags ? 'hide-visual-tags' : ''}`}>
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
        <div className="relative flex items-center" ref={tagDropdownRef}>
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

          <button
            type="button"
            onClick={() => {
              setShowCreateTag(true);
              setShowTagSelector(false);
            }}
            className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors ml-1 flex items-center gap-1 text-xs"
            title="Create new tag"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">New Tag</span>
          </button>

          {enableTextStyling && (
            <div className="flex items-center gap-3 ml-2 border-l border-border pl-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Text:</span>
                <div className="flex items-center gap-1">
                  {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#111827'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => editor?.chain().focus().setMark('textColor', { color: c }).run()}
                      className="w-4 h-4 rounded border border-border"
                      style={{ backgroundColor: c }}
                      title={`Text ${c}`}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  onChange={(e) => editor?.chain().focus().setMark('textColor', { color: e.target.value }).run()}
                  className="w-6 h-6 border border-input rounded cursor-pointer"
                  title="Text Color"
                />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().unsetMark('textColor').run()}
                  className="p-1 rounded hover:bg-accent"
                  title="Remove Text Color"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Highlight:</span>
                <div className="flex items-center gap-1">
                  {['#fff59d', '#fecaca', '#bbf7d0', '#bfdbfe', '#e9d5ff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => editor?.chain().focus().setMark('textHighlight', { backgroundColor: c }).run()}
                      className="w-4 h-4 rounded border border-border"
                      style={{ backgroundColor: c }}
                      title={`Highlight ${c}`}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  defaultValue="#ffff00"
                  onChange={(e) => editor?.chain().focus().setMark('textHighlight', { backgroundColor: e.target.value }).run()}
                  className="w-6 h-6 border border-input rounded cursor-pointer"
                  title="Highlight Color"
                />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().unsetMark('textHighlight').run()}
                  className="p-1 rounded hover:bg-accent"
                  title="Remove Highlight"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {showTagSelector && (
            <div key={tagUpdateTrigger} className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto min-w-48">
              {getAllTags().map(tag => (
                <button
                  key={tag.id}
                  onClick={() => insertTag(tag.label)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <span
                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded shrink-0"
                    style={{
                      backgroundColor: tag.bgColor,
                      color: tag.color,
                      border: `1px solid ${tag.color}20`
                    }}
                  >
                    {tag.label}
                  </span>
                  <span className="text-muted-foreground truncate">{tag.description}</span>
                  {tag.isCustom && (
                    <span
                      onClick={(e) => handleDeleteTag(tag.id, e)}
                      className="text-xs text-muted-foreground hover:text-destructive ml-auto shrink-0 p-0.5 hover:bg-destructive/10 rounded cursor-pointer select-none"
                      title="Delete custom tag"
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create Tag Modal */}
        {showCreateTag && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateTag(false)}>
            <div className="bg-background border border-border rounded-lg p-6 w-80 max-w-[90vw] shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Create New Tag</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tag Label</label>
                  <input
                    type="text"
                    placeholder="Enter tag name"
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-12 h-10 border border-input rounded-md cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">Choose a color for your tag</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreateTag}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium transition-colors"
                  >
                    Create Tag
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateTag(false);
                      setNewTagLabel('');
                      setNewTagColor('#3b82f6');
                    }}
                    className="px-4 py-2 border border-input rounded-md hover:bg-accent font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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