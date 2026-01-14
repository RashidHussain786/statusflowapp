import { Extension } from '@tiptap/core';
import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { STATUS_TAGS, getAllTags, hexToRgba } from './tags';

// Generate a consistent random color for unknown tags based on tag label
function getRandomColorForTag(tagLabel: string): { bgColor: string; color: string } {
  // Create a simple hash from the tag label for consistent colors
  let hash = 0;
  for (let i = 0; i < tagLabel.length; i++) {
    hash = tagLabel.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate hue from hash (0-360)
  const hue = Math.abs(hash) % 360;

  // Use consistent saturation and lightness for readability
  const bgColor = `hsl(${hue}, 90%, 95%)`;
  const color = `hsl(${hue}, 70%, 30%)`;

  return { bgColor, color };
}

export const VisualTagsExtension = Extension.create({
  name: 'visualTags',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const tagMap = new Map<string, any>();

            // Create lookup map for all tags
            getAllTags().forEach(tag => {
              tagMap.set(tag.label.toLowerCase(), tag);
            });

            state.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                // Find all [TAG] patterns in the text
                const regex = /\[([A-Z\s]+)\]/g;
                let match;

                while ((match = regex.exec(node.text)) !== null) {
                  const tagLabel = match[1].toUpperCase();
                  let tag = tagMap.get(tagLabel.toLowerCase());

                  // If tag not found, create a random color for it
                  if (!tag) {
                    const randomColors = getRandomColorForTag(tagLabel);
                    tag = {
                      id: `random-${tagLabel.toLowerCase().replace(/\s+/g, '-')}`,
                      label: tagLabel,
                      ...randomColors
                    };
                  }

                  // Create decoration for the tag
                  const start = pos + match.index;
                  const end = start + match[0].length;

                  decorations.push(
                    Decoration.inline(start, end, {
                      class: `visual-tag tag-${tag.id.toLowerCase()}`,
                      style: `
                        background-color: ${tag.bgColor};
                        color: ${tag.color};
                        padding: 0.125rem 0.25rem;
                        border-radius: 0.25rem;
                        border: 1px solid ${hexToRgba(tag.color, 0.25)};
                        font-weight: 500;
                        font-size: 0.75rem;
                        display: inline-block;
                        margin: 0 0.125rem;
                      `
                    })
                  );
                }
              }
            });

            return DecorationSet.create(state.doc, decorations);
          }
        }
      })
    ];
  }
});