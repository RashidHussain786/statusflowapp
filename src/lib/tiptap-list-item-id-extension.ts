import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Slice, Fragment, Node } from '@tiptap/pm/model';
import { nanoid } from 'nanoid';

export const ListItemIdExtension = Extension.create({
    name: 'listItemId',

    addGlobalAttributes() {
        return [
            {
                types: ['listItem'],
                attributes: {
                    'data-id': {
                        default: null,
                        parseHTML: (element) => element.getAttribute('data-id'),
                        renderHTML: (attributes) => {
                            if (!attributes['data-id']) {
                                return {};
                            }
                            return {
                                'data-id': attributes['data-id'],
                            };
                        },
                    },
                },
            },
        ];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('listItemId'),
                props: {
                    transformPasted: (slice: Slice) => {
                        // STRIP IDs ON MANUAL PASTE
                        // This ensures that copying content from another user/source generates NEW IDs,
                        // preventing duplicates. 'Load Previous' uses setContent(), which bypasses this.
                        const mapContent = (content: Fragment): Fragment => {
                            const nodes: Node[] = [];
                            content.forEach((node) => {
                                let newNode = node;
                                if (node.type.name === 'listItem') {
                                    const newAttrs = { ...node.attrs, 'data-id': null };
                                    newNode = node.type.create(newAttrs, mapContent(node.content), node.marks);
                                } else if (node.content.size > 0) {
                                    newNode = node.copy(mapContent(node.content));
                                }
                                nodes.push(newNode);
                            });
                            return Fragment.from(nodes);
                        };

                        return new Slice(mapContent(slice.content), slice.openStart, slice.openEnd);
                    },
                },
                appendTransaction: (transactions, oldState, newState) => {
                    // We only want to run this if the document changed
                    if (!transactions.some(tr => tr.docChanged)) {
                        return null;
                    }

                    const tr = newState.tr;
                    let modified = false;
                    const seenIds = new Set<string>();

                    newState.doc.descendants((node, pos) => {
                        if (node.type.name === 'listItem') {
                            const currentId = node.attrs['data-id'];

                            // If no ID, duplicate ID, or incorrect length (migration to 12 chars)
                            if (!currentId || seenIds.has(currentId) || currentId.length !== 12) {
                                const newId = nanoid(12);
                                tr.setNodeAttribute(pos, 'data-id', newId);
                                modified = true;
                                seenIds.add(newId);
                            } else {
                                seenIds.add(currentId);
                            }
                        }
                    });

                    if (modified) {
                        return tr;
                    }

                    return null;
                },
            }),
        ];
    },
});
