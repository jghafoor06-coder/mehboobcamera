/**
 * Shared constants used across the application.
 * Extracted from screens to eliminate duplication and centralize values.
 */

export const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'cameras', name: 'Cameras' },
  { id: 'lenses', name: 'Lenses' },
  { id: 'tripods', name: 'Tripods' },
  { id: 'lighting', name: 'Lighting' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'gimble', name: 'Gimble' },
];

// Category without "All" — used in AddItemScreen form
export const ITEM_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all');

export const CATEGORY_ICONS = {
  Cameras: '🎬',
  Lenses: '🔍',
  Tripods: '📐',
  Lighting: '💡',
  Accessories: '🔧',
};

export const CATEGORY_COLORS = {
  Cameras: '#6366F1',
  Lenses: '#06B6D4',
  Tripods: '#10B981',
  Lighting: '#F59E0B',
  Accessories: '#EF4444',
};

export const RENTAL_STATUS_COLORS = {
  upcoming: { bg: '#6366F120', text: '#6366F1', dot: '#6366F1' },
  ongoing: { bg: '#10B98120', text: '#10B981', dot: '#10B981' },
  completed: { bg: '#6B728020', text: '#9CA3AF', dot: '#6B7280' },
};

export const PAYMENT_STATUS_COLORS = {
  paid: { text: '#10B981', bg: '#10B98115' },
  partial: { text: '#F59E0B', bg: '#F59E0B15' },
  unpaid: { text: '#EF4444', bg: '#EF444415' },
};

export const EQUIPMENT_TABS = ['Availability', 'Rentals', 'Insights'];
