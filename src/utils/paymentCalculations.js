/**
 * Payment-related calculation utilities.
 * Extracted from RentalDetailScreen to separate concerns from rendering.
 */

/**
 * Calculate remaining balance after a payment.
 * @param {number} totalAmount
 * @param {number} amountPaid
 * @returns {number}
 */
export const computeRemainingBalance = (totalAmount, amountPaid) => {
  return Math.max(0, totalAmount - (amountPaid || 0));
};

/**
 * Check if payment amount exceeds the total.
 * @param {number} paymentAmount
 * @param {number} maxAmount
 * @returns {boolean}
 */
export const exceedsAmount = (paymentAmount, maxAmount) => {
  return paymentAmount > maxAmount;
};

/**
 * Format a rental ID for display as an invoice number.
 * @param {string|number} id
 * @param {number} padLength
 * @returns {string}
 */
export const formatInvoiceId = (id, padLength = 4) => {
  return `#${String(id).toString().padStart(padLength, '0')}`;
};
