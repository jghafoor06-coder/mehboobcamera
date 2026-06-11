/**
 * Rental-related calculation utilities.
 * Extracted from screens to separate concerns from rendering.
 */

/**
 * Compute the total rental amount from selected items, quantities, and duration.
 * @param {Array} selectedItems - Array of item objects with pricePerDay
 * @param {Object} quantities - Map of itemId -> quantity
 * @param {number} totalDays
 * @returns {number}
 */
export const computeTotalAmount = (selectedItems, quantities, totalDays) => {
  return selectedItems.reduce((sum, item) => {
    const qty = quantities[item.id] || 1;
    return sum + item.pricePerDay * totalDays * qty;
  }, 0);
};

/**
 * Compute the total units across all rental items.
 * @param {Array} items - Array of rental item objects with quantity
 * @returns {number}
 */
export const computeTotalUnits = (items) => {
  return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
};

/**
 * Check if any selected item has availability issues.
 * @param {Array} selectedItems
 * @param {Object} availabilityMap - Map of itemId -> availability result
 * @returns {boolean}
 */
export const hasAvailabilityIssues = (selectedItems, availabilityMap) => {
  return selectedItems.some((item) => {
    const avail = availabilityMap[item.id];
    return avail && !avail.available;
  });
};

/**
 * Get the payment status label from paid and remaining amounts.
 * @param {number} paid
 * @param {number} remaining
 * @returns {'paid' | 'partial' | 'unpaid'}
 */
export const getPaymentStatus = (paid, remaining) => {
  if (remaining === 0) return 'paid';
  if (paid > 0 && remaining > 0) return 'partial';
  return 'unpaid';
};
