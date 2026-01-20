export interface StatusTag {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  isCustom?: boolean;
}

export const STATUS_TAGS: StatusTag[] = [
  {
    id: 'enh',
    label: 'ENH',
    color: '#3b82f6', // blue-500
    bgColor: '#eff6ff', // blue-50
    description: 'Enhancement'
  },
  {
    id: 'ticket',
    label: 'TICKET',
    color: '#6366f1', // indigo-500
    bgColor: '#eef2ff', // indigo-50
    description: 'Ticket/Reference'
  },
  {
    id: 'working',
    label: 'WORKING',
    color: '#f59e0b', // amber-500
    bgColor: '#fffbeb', // amber-50
    description: 'In Progress'
  },
  {
    id: 'pending',
    label: 'PENDING',
    color: '#6b7280', // gray-500
    bgColor: '#f9fafb', // gray-50
    description: 'Pending Review'
  },
  {
    id: 'uat',
    label: 'UAT',
    color: '#8b5cf6', // violet-500
    bgColor: '#f3e8ff', // violet-50
    description: 'User Acceptance Testing'
  },
  {
    id: 'approved',
    label: 'APPROVED',
    color: '#10b981', // emerald-500
    bgColor: '#ecfdf5', // emerald-50
    description: 'Approved'
  },
  {
    id: 'blocked',
    label: 'BLOCKED',
    color: '#ef4444', // red-500
    bgColor: '#fef2f2', // red-50
    description: 'Blocked'
  },
  {
    id: 'review',
    label: 'REVIEW',
    color: '#06b6d4', // cyan-500
    bgColor: '#ecfeff', // cyan-50
    description: 'Under Review'
  },
  {
    id: 'qa',
    label: 'QA',
    color: '#ec4899', // pink-500
    bgColor: '#fdf2f8', // pink-50
    description: 'Quality Assurance'
  },
  {
    id: 'hold',
    label: 'HOLD',
    color: '#d97706', // amber-600
    bgColor: '#fffbeb', // amber-50
    description: 'On Hold'
  }
];

export const getTagById = (id: string): StatusTag | undefined => {
  return STATUS_TAGS.find(tag => tag.id === id);
};

export const getTagByLabel = (label: string): StatusTag | undefined => {
  return STATUS_TAGS.find(tag => tag.label === label);
};

export const DEFAULT_TAGS = ['enh', 'working'];

// Custom tag management
export interface CustomTagData {
  tags: StatusTag[];
  version: 1;
}

const CUSTOM_TAGS_KEY = 'statusgen-custom-tags';

// Get all tags (default + custom)
export const getAllTags = (): StatusTag[] => {
  const customTags = loadCustomTags();
  return [...customTags, ...STATUS_TAGS];
};

// Load custom tags from localStorage
export const loadCustomTags = (): StatusTag[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_TAGS_KEY);
    if (stored) {
      const data: CustomTagData = JSON.parse(stored);
      return data.tags || [];
    }
  } catch (error) {
    console.warn('Failed to load custom tags:', error);
  }
  return [];
};

// Save custom tags to localStorage
export const saveCustomTags = (tags: StatusTag[]): void => {
  try {
    const data: CustomTagData = {
      tags,
      version: 1
    };
    localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save custom tags:', error);
  }
};

// Helper to convert hex to rgba
export function hexToRgba(hex: string, alpha: number): string {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    let c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    const val = parseInt(c.join(''), 16);
    return `rgba(${(val >> 16) & 255}, ${(val >> 8) & 255}, ${val & 255}, ${alpha})`;
  }
  // fallback for non-hex colors
  if (hex.startsWith('rgb')) {
    const rgba = hex.replace(/^(rgb|rgba)\(/, '').replace(/\)$/, '').replace(/\s/g, '').split(',');
    if (rgba.length === 3) {
      return `rgba(${rgba.join(',')},${alpha})`;
    }
    return hex; // It's already rgba or something else
  }
  return hex; // Not a hex color, return as is.
}

// Add a new custom tag
export const addCustomTag = (label: string, color: string): StatusTag => {
  const customTags = loadCustomTags();

  // Generate a unique ID
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const newTag: StatusTag = {
    id,
    label: label.toUpperCase(),
    color,
    bgColor: hexToRgba(color, 0.1), // Add transparency
    description: `Custom tag: ${label}`,
    isCustom: true
  };

  const updatedTags = [...customTags, newTag];
  saveCustomTags(updatedTags);

  return newTag;
};

// Remove a custom tag
export const removeCustomTag = (tagId: string): void => {
  const customTags = loadCustomTags();
  const filteredTags = customTags.filter(tag => tag.id !== tagId);
  saveCustomTags(filteredTags);
};

// Check if a tag label already exists
export const isTagLabelTaken = (label: string): boolean => {
  const allTags = getAllTags();
  return allTags.some(tag => tag.label.toLowerCase() === label.toLowerCase());
};

/**
 * Shared logic for styling tags consistently across editor and static views.
 */
export function getTagStyles(tagLabel: string) {
  const label = tagLabel.toUpperCase();
  const tag = getTagByLabel(label);

  if (tag) {
    return { color: tag.color, fontWeight: '600' };
  }

  // Consistent random color for unknown tags
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color = `hsl(${hue}, 70%, 30%)`;
  return { color, fontWeight: '600' };
}

/**
 * Renders bracketed tags (e.g. [DONE]) with colors in static HTML strings.
 */
export function renderTagsInHtml(html: string): string {
  if (!html) return '';

  return html.replace(/\[([A-Z\s]+)\]/g, (match, tagLabel) => {
    const styles = getTagStyles(tagLabel);
    return `<span class="visual-tag" style="color: ${styles.color}; font-weight: ${styles.fontWeight}; margin-left: 0.2rem;">[${tagLabel}]</span>`;
  });
}