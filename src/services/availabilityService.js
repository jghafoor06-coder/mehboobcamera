import { db } from '../firebase/firebaseConfig';
import {
  getCachedRentalsForItem,
  setCachedRentalsForItem,
  getCachedItemQuantity,
  setCachedItemQuantity,
  getCachedEquipmentAvailability,
  setCachedEquipmentAvailability,
  invalidateByPrefix,
} from './availabilityCache';

// ═══════════════════════════════════════════════════════════════════════
// Rental Slot Definitions
// ═══════════════════════════════════════════════════════════════════════

export const RENTAL_SLOTS = {
  full_day: { label: 'Full Day', shortLabel: 'Full Day' },
  day: { label: 'Day', shortLabel: 'Day', time: '08:00 AM → 06:00 PM' },
  evening: { label: 'Evening', shortLabel: 'Evening', time: '06:00 PM → 11:59 PM' },
};

export const SLOT_CONFLICT_MAP = {
  full_day: ['day', 'evening', 'full_day'],
  day: ['day', 'full_day'],
  evening: ['evening', 'full_day'],
};

/**
 * Check if two rental slots conflict with each other.
 */
export const slotsConflict = (slotA, slotB) => {
  const conflicts = SLOT_CONFLICT_MAP[slotA];
  return conflicts ? conflicts.includes(slotB) : false;
};

/**
 * Check if two date ranges overlap (inclusive of start and end dates).
 */
export const datesOverlap = (startA, endA, startB, endB) => {
  const sA = new Date(startA);
  const eA = new Date(endA);
  const sB = new Date(startB);
  const eB = new Date(endB);
  sA.setHours(0, 0, 0, 0);
  eA.setHours(23, 59, 59, 999);
  sB.setHours(0, 0, 0, 0);
  eB.setHours(23, 59, 59, 999);
  return sA <= eB && eA >= sB;
};

// ═══════════════════════════════════════════════════════════════════════
// Firestore Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get total quantity for an item from the inventory.
 * This is the TOTAL quantity of the item (not remaining stock).
 * @param {string} itemId
 * @returns {Promise<number>}
 */
export const getItemTotalQuantity = async (itemId) => {
  // Check cache first
  const cached = getCachedItemQuantity(itemId);
  if (cached != null) return cached;

  try {
    const itemDoc = await db.collection('items').doc(itemId).get();
    if (!itemDoc.exists) return 0;
    const itemData = itemDoc.data();
    const quantity = itemData.quantity || 0;
    setCachedItemQuantity(itemId, quantity);
    return quantity;
  } catch (error) {
    console.error('Error getting item total quantity:', error);
    return 0;
  }
};

/**
 * Fetch ALL rentals that include a specific item, across all customers.
 * Does NOT filter by status — uses ALL rentals because availability
 * is determined purely by date overlap.
 *
 * @param {string} itemId
 * @returns {Promise<Array>} Array of rental objects with customerId attached
 */
export const getRentalsForItem = async (itemId) => {
  // Check cache first
  const cached = getCachedRentalsForItem(itemId);
  if (cached) return cached;

  try {
    const customersSnapshot = await db.collection('customers').get();
    const matchingRentals = [];

    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .get();

      for (const rentalDoc of rentalsSnapshot.docs) {
        const rentalData = rentalDoc.data();
        const items = rentalData.items || [];
        const hasItem = items.some((i) => i.itemId === itemId);
        if (hasItem) {
          matchingRentals.push({
            id: rentalDoc.id,
            customerId: customerDoc.id,
            ...rentalData,
            startDate: rentalData.startDate?.toDate?.() || new Date(rentalData.startDate),
            endDate: rentalData.endDate?.toDate?.() || new Date(rentalData.endDate),
            createdAt: rentalData.createdAt?.toDate?.() || new Date(),
          });
        }
      }
    }

    setCachedRentalsForItem(itemId, matchingRentals);
    return matchingRentals;
  } catch (error) {
    console.error('Error fetching rentals for item:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Pure Date-Based Availability Functions (no Firestore calls)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate the booked quantity for a specific date from a list of rentals.
 * A rental counts as booked on a date if:
 *   selectedDate >= rental.startDate && selectedDate <= rental.endDate
 *
 * Slot conflicts are respected: day/evening only conflict with full_day and their own type.
 *
 * @param {Date} selectedDate - The date to check
 * @param {Array} rentals - Array of rental objects
 * @param {string} itemId - The item ID to filter by
 * @param {string|null} slotFilter - Optional: filter by slot (for slot-specific queries)
 * @returns {{ total: number, breakdown: { full_day: number, day: number, evening: number } }}
 */
export const getBookedQuantityForDate = (selectedDate, rentals, itemId, slotFilter = null) => {
  const date = new Date(selectedDate);
  date.setHours(0, 0, 0, 0);

  let fullDayBooked = 0;
  let dayBooked = 0;
  let eveningBooked = 0;

  for (const rental of rentals) {
    const items = rental.items || [];
    const rentalItem = items.find((i) => i.itemId === itemId);
    if (!rentalItem) continue;

    const rentalStart = new Date(rental.startDate);
    const rentalEnd = new Date(rental.endDate);
    rentalStart.setHours(0, 0, 0, 0);
    rentalEnd.setHours(23, 59, 59, 999);

    // Only count if the selected date falls within the rental period
    const isInRange = date >= rentalStart && date <= rentalEnd;
    if (!isInRange) continue;

    // Apply slot filter if provided
    const rentalSlot = rental.rentalSlot || 'full_day';
    if (slotFilter && !slotsConflict(slotFilter, rentalSlot)) continue;

    const qty = rentalItem.quantity || 0;

    if (rentalSlot === 'full_day') {
      fullDayBooked += qty;
    } else if (rentalSlot === 'day') {
      dayBooked += qty;
    } else if (rentalSlot === 'evening') {
      eveningBooked += qty;
    }
  }

  return {
    total: fullDayBooked + dayBooked + eveningBooked,
    breakdown: { full_day: fullDayBooked, day: dayBooked, evening: eveningBooked },
  };
};

/**
 * Get available quantity for a specific date.
 * @param {Date} selectedDate
 * @param {Array} rentals
 * @param {string} itemId
 * @param {number} totalQuantity
 * @param {string|null} slotFilter
 * @returns {{ available: number, booked: number, totalQuantity: number }}
 */
export const getAvailableQuantityForDate = (selectedDate, rentals, itemId, totalQuantity, slotFilter = null) => {
  const booked = getBookedQuantityForDate(selectedDate, rentals, itemId, slotFilter);
  return {
    available: Math.max(0, totalQuantity - booked.total),
    booked: booked.total,
    breakdown: booked.breakdown,
    totalQuantity,
  };
};

/**
 * Check availability across an entire date range.
 * Returns the MINIMUM available quantity across all days in the range.
 * This prevents overbooking by using the most constrained day.
 *
 * @param {string} itemId
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {Array} rentals - Pre-fetched rentals (or null to fetch)
 * @param {string|null} slotFilter
 * @param {number|null} totalQuantity - Pre-fetched total (or null to fetch)
 * @returns {Promise<{ available: boolean, minAvailable: number, minBooked: number, totalQuantity: number, dayDetails: Array }>}
 */
export const checkAvailabilityForDateRange = async (
  itemId,
  startDate,
  endDate,
  rentals = null,
  slotFilter = null,
  totalQuantity = null,
) => {
  // Fetch data if not provided
  const [resolvedRentals, resolvedTotal] = await Promise.all([
    rentals || getRentalsForItem(itemId),
    totalQuantity != null ? Promise.resolve(totalQuantity) : getItemTotalQuantity(itemId),
  ]);

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  let minAvailable = resolvedTotal;
  let maxBooked = 0;
  const dayDetails = [];

  // Iterate through each day in the range
  const current = new Date(start);
  while (current <= end) {
    const dayAvail = getAvailableQuantityForDate(current, resolvedRentals, itemId, resolvedTotal, slotFilter);
    dayDetails.push({
      date: new Date(current),
      available: dayAvail.available,
      booked: dayAvail.booked,
      breakdown: dayAvail.breakdown,
    });

    if (dayAvail.available < minAvailable) {
      minAvailable = dayAvail.available;
    }
    if (dayAvail.booked > maxBooked) {
      maxBooked = dayAvail.booked;
    }

    current.setDate(current.getDate() + 1);
  }

  const totalBooked = Math.min(resolvedTotal, maxBooked);

  return {
    available: minAvailable > 0,
    minAvailable,
    maxBooked: totalBooked,
    totalQuantity: resolvedTotal,
    dayDetails,
  };
};

/**
 * Legacy checkAvailability — wraps checkAvailabilityForDateRange for backward compatibility.
 * Returns the same shape as the original function.
 *
 * @param {string} itemId
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {string} rentalSlot
 * @param {number} requestedQuantity
 * @param {Array|null} existingRentals
 * @returns {Promise<object>}
 */
export const checkAvailability = async (
  itemId,
  startDate,
  endDate,
  rentalSlot,
  requestedQuantity,
  existingRentals = null,
) => {
  const rangeResult = await checkAvailabilityForDateRange(
    itemId,
    startDate,
    endDate,
    existingRentals,
    rentalSlot,
    null,
  );

  const qtyAvailable = rangeResult.minAvailable;
  const qtyBooked = rangeResult.maxBooked;

  let status;
  let message;

  if (requestedQuantity > rangeResult.totalQuantity) {
    status = 'unavailable';
    message = `🔴 Not Available — Only ${rangeResult.totalQuantity} unit${rangeResult.totalQuantity !== 1 ? 's' : ''} total`;
  } else if (qtyAvailable >= requestedQuantity) {
    const remainingAfter = qtyAvailable - requestedQuantity;
    if (remainingAfter <= 1 || qtyAvailable <= Math.ceil(rangeResult.totalQuantity * 0.3)) {
      status = 'low';
      message = `🟠 Only ${qtyAvailable} Available`;
    } else {
      status = 'available';
      message = `🟢 Available`;
    }
  } else {
    status = 'unavailable';
    message = `🔴 Not Available — ${qtyAvailable} unit${qtyAvailable !== 1 ? 's' : ''} available`;
  }

  return {
    available: qtyAvailable >= requestedQuantity,
    status,
    bookedQuantity: qtyBooked,
    availableQuantity: qtyAvailable,
    totalQuantity: rangeResult.totalQuantity,
    message,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// Equipment-Level Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get full availability snapshot for a specific equipment item for today.
 *
 * @param {string} itemId
 * @param {Array|null} existingRentals
 * @returns {Promise<{ item: object, available: number, total: number, booked: number, percentAvailable: number }>}
 */
export const getEquipmentAvailability = async (itemId, existingRentals = null) => {
  // Check cache first (only when not providing external rentals)
  if (!existingRentals) {
    const cached = getCachedEquipmentAvailability(itemId);
    if (cached) return cached;
  }

  try {
    const itemDoc = await db.collection('items').doc(itemId).get();
    if (!itemDoc.exists) return null;

    const itemData = { id: itemDoc.id, ...itemDoc.data() };
    const totalQuantity = itemData.quantity || 0;
    const rentals = existingRentals || (await getRentalsForItem(itemId));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const booked = getBookedQuantityForDate(today, rentals, itemId);
    const available = Math.max(0, totalQuantity - booked.total);
    const percentAvailable = totalQuantity > 0 ? Math.round((available / totalQuantity) * 100) : 0;

    const result = {
      item: itemData,
      available,
      total: totalQuantity,
      booked: booked.total,
      percentAvailable,
    };

    if (!existingRentals) {
      setCachedEquipmentAvailability(itemId, result);
    }

    return result;
  } catch (error) {
    console.error('Error getting equipment availability:', error);
    throw error;
  }
};

/**
 * Get total equipment currently out (sum of quantities in rentals active today).
 * Uses date overlap — NOT rental status.
 * @returns {Promise<number>}
 */
export const getEquipmentCurrentlyOut = async () => {
  try {
    const customersSnapshot = await db.collection('customers').get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalOut = 0;

    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref.collection('rentals').get();

      for (const rentalDoc of rentalsSnapshot.docs) {
        const rentalData = rentalDoc.data();
        const start = rentalData.startDate?.toDate?.() || new Date(rentalData.startDate);
        const end = rentalData.endDate?.toDate?.() || new Date(rentalData.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Only count if today falls within the rental period
        if (today >= start && today <= end) {
          const items = rentalData.items || [];
          for (const item of items) {
            totalOut += item.quantity || 0;
          }
        }
      }
    }

    return totalOut;
  } catch (error) {
    console.error('Error getting equipment currently out:', error);
    throw error;
  }
};

/**
 * Get low availability alerts based on upcoming bookings.
 * Checks the next 7 days for each item.
 * @returns {Promise<Array>}
 */
export const getLowAvailabilityAlerts = async () => {
  try {
    const itemsSnapshot = await db.collection('items').get();
    const items = itemsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all rentals for all items in one pass
    const customersSnapshot = await db.collection('customers').get();
    const allRentals = [];
    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref.collection('rentals').get();
      for (const rentalDoc of rentalsSnapshot.docs) {
        allRentals.push({
          id: rentalDoc.id,
          ...rentalDoc.data(),
          startDate: rentalDoc.data().startDate?.toDate?.() || new Date(rentalDoc.data().startDate),
          endDate: rentalDoc.data().endDate?.toDate?.() || new Date(rentalDoc.data().endDate),
        });
      }
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const alerts = [];
    for (const item of items) {
      const totalQty = item.quantity || 0;
      // Check availability for tomorrow
      const tomorrowAvail = getAvailableQuantityForDate(tomorrow, allRentals, item.id, totalQty);

      if (tomorrowAvail.available <= 2) {
        alerts.push({
          itemId: item.id,
          itemName: item.name,
          totalQuantity: totalQty,
          bookedQuantity: tomorrowAvail.booked,
          availableQuantity: tomorrowAvail.available,
          critical: tomorrowAvail.available <= 0,
          checkDate: new Date(tomorrow),
        });
      }
    }

    return alerts.sort((a, b) => a.availableQuantity - b.availableQuantity);
  } catch (error) {
    console.error('Error getting low availability alerts:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Rental Lifecycle Status (Date-Based)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the lifecycle status of a rental purely from dates.
 * - 'upcoming':  current date < rental start date
 * - 'ongoing':   current date is between start and end date (inclusive)
 * - 'completed': end date has passed OR rental was manually returned
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {string} firestoreStatus - The Firestore 'status' field (active/returned)
 * @returns {'upcoming' | 'ongoing' | 'completed'}
 */
export const getRentalLifecycleStatus = (startDate, endDate, firestoreStatus = 'active', nowOverride = null) => {
  const now = nowOverride ? new Date(nowOverride) : new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // If manually returned, always completed
  if (firestoreStatus === 'returned') return 'completed';

  // If end date has passed, completed
  if (now > end) return 'completed';

  // If today is within the rental period, ongoing
  if (now >= start && now <= end) return 'ongoing';

  // If start date is in the future, upcoming
  return 'upcoming';
};

// Alias for backward compatibility
export const checkDateRangeAvailability = checkAvailability;
