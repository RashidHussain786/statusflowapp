import { Extension } from '@tiptap/core';
import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { getTagStyles, getAllTags } from './tags';

export const VisualTagsExtension = Extension.create({
  name: 'visualTags',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const tagMap = new Map<string, import('./tags').StatusTag>();

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
                  const styles = getTagStyles(tagLabel);

                  // Create decoration for the tag
                  const start = pos + match.index;
                  const end = start + match[0].length;

                  decorations.push(
                    Decoration.inline(start, end, {
                      class: `visual-tag`,
                      style: `
                        color: ${styles.color};
                        font-weight: ${styles.fontWeight};
                        margin-left: 0.3em;
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