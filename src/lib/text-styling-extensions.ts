import { Mark } from '@tiptap/core';

// Text Color Mark
export const TextColor = Mark.create({
    name: 'textColor',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            color: {
                default: null,
                parseHTML: element => element.style.color || element.getAttribute('data-text-color'),
                renderHTML: attributes => {
                    if (!attributes.color) {
                        return {};
                    }

                    return {
                        style: `color: ${attributes.color}`,
                        'data-text-color': attributes.color,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-text-color]',
                getAttrs: element => ({
                    color: element.getAttribute('data-text-color'),
                }),
            },
            {
                style: 'color',
                getAttrs: value => ({
                    color: value,
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', HTMLAttributes, 0];
    },
});

// Text Highlight Mark
export const TextHighlight = Mark.create({
    name: 'textHighlight',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            backgroundColor: {
                default: null,
                parseHTML: element => element.style.backgroundColor || element.getAttribute('data-text-highlight'),
                renderHTML: attributes => {
                    if (!attributes.backgroundColor) {
                        return {};
                    }

                    return {
                        style: `background-color: ${attributes.backgroundColor}`,
                        'data-text-highlight': attributes.backgroundColor,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-text-highlight]',
                getAttrs: element => ({
                    backgroundColor: element.getAttribute('data-text-highlight'),
                }),
            },
            {
                style: 'background-color',
                getAttrs: value => ({
                    backgroundColor: value,
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', HTMLAttributes, 0];
    },
});