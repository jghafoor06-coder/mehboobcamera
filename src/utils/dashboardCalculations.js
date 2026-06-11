/**
 * Dashboard-specific calculation utilities.
 * Extracted from DashboardScreen to separate concerns from rendering.
 */

/**
 * Determine whether the initial loading spinner should show.
 * @param {string} loadingPhase
 * @param {number} totalCustomers
 * @returns {boolean}
 */
export const shouldShowInitialLoading = (loadingPhase, totalCustomers) => {
  return loadingPhase !== 'done' && totalCustomers === 0;
};

/**
 * Get the greeting text based on time of day.
 * @returns {string}
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Quick action definitions for the dashboard.
 */
export const QUICK_ACTIONS = [
  { id: '1', label: 'Add Customer', icon: '👤', screen: 'AddCustomer' },
  { id: '2', label: 'Add Item', icon: '📦', screen: 'AddItem' },
  { id: '3', label: 'Inventory', icon: '🎬', screen: 'Inventory' },
];
