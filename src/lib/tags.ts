export interface StatusTag {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
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