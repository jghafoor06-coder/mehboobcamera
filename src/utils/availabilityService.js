import { db } from '../firebase/firebaseConfig';

/**
 * Rental slot types and their conflict rules.
 * 'full_day' conflicts with all slots.
 * 'day' conflicts with 'day' and 'full_day'.
 * 'evening' conflicts with 'evening' and 'full_day'.
 */
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
 * @param {string} slotA - 'day' | 'evening' | 'full_day'
 * @param {string} slotB - 'day' | 'evening' | 'full_day'
 * @returns {boolean}
 */
export const slotsConflict = (slotA, slotB) => {
  const conflicts = SLOT_CONFLICT_MAP[slotA];
  return conflicts ? conflicts.includes(slotB) : false;
};

/**
 * Check if two date ranges overlap (inclusive of start and end dates).
 * @param {Date} startA
 * @param {Date} endA
 * @param {Date} startB
 * @param {Date} endB
 * @returns {boolean}
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

/**
 * Fetch all rentals that include a specific item across all customers.
 * Uses optimized queries: only fetches customers that have rentals.
 * @param {string} itemId
 * @returns {Promise<Array>} Array of rental objects with customerId attached
 */
export const getRentalsForItem = async (itemId) => {
  try {
    const customersSnapshot = await db.collection('customers').get();
    const matchingRentals = [];

    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .where('status', '==', 'active')
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

    return matchingRentals;
  } catch (error) {
    console.error('Error fetching rentals for item:', error);
    throw error;
  }
};

/**
 * Check availability for a specific item on given dates and slot.
 * Returns availability status with details.
 *
 * @param {string} itemId
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {string} rentalSlot - 'day' | 'evening' | 'full_day'
 * @param {number} requestedQuantity
 * @param {Array} existingRentals - Optional pre-fetched rentals (for caching)
 * @returns {Promise<{available: boolean, bookedQuantity: number, availableQuantity: number, totalQuantity: number, message: string}>}
 */
export const checkAvailability = async (
  itemId,
  startDate,
  endDate,
  rentalSlot,
  requestedQuantity,
  existingRentals = null,
) => {
  // Get total quantity from inventory
  const itemDoc = await db.collection('items').doc(itemId).get();
  if (!itemDoc.exists) {
    return {
      available: false,
      bookedQuantity: 0,
      availableQuantity: 0,
      totalQuantity: 0,
      message: 'Item not found',
    };
  }

  const itemData = itemDoc.data();

  // Get existing rentals for this item
  const rentals = existingRentals || (await getRentalsForItem(itemId));

  // Exclude the current rental being edited (if we have an ID to exclude)
  // For new rentals, there's nothing to exclude

  // Filter rentals that conflict with the requested date range and slot
  let bookedQuantity = 0;
  for (const rental of rentals) {
    const rentalStart = new Date(rental.startDate);
    const rentalEnd = new Date(rental.endDate);

    if (
      datesOverlap(startDate, endDate, rentalStart, rentalEnd) &&
      slotsConflict(rentalSlot, rental.rentalSlot)
    ) {
      // Find the item in this rental and add its quantity
      const rentalItem = (rental.items || []).find((i) => i.itemId === itemId);
      if (rentalItem) {
        bookedQuantity += rentalItem.quantity || 0;
      }
    }
  }

  // The item's `quantity` field in Firestore is a running count (decremented on
  // rental creation, incremented on return). So it represents the CURRENT
  // remaining stock. We calculate total capacity as remaining + booked.
  const remainingStock = itemData.quantity || 0;
  const totalQuantity = remainingStock + bookedQuantity;
  const availableQuantity = remainingStock;
  const available = availableQuantity >= requestedQuantity;

  let message;
  let status;
  if (!available) {
    status = 'unavailable';
    message = `🔴 Not Available — ${availableQuantity} unit${availableQuantity !== 1 ? 's' : ''} available`;
  } else if (availableQuantity <= 2 || (bookedQuantity > 0 && availableQuantity <= Math.ceil(totalQuantity * 0.3))) {
    status = 'low';
    message = `🟠 Only ${availableQuantity} Available`;
  } else {
    status = 'available';
    message = `🟢 Available`;
  }

  return {
    available,
    status,
    bookedQuantity,
    availableQuantity,
    totalQuantity,
    message,
  };
};

/**
 * Get all items that have low stock or are currently over-booked.
 * Used for dashboard alerts.
 * @returns {Promise<Array>}
 */
export const getLowAvailabilityAlerts = async () => {
  try {
    const itemsSnapshot = await db.collection('items').get();
    const items = itemsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const alerts = [];
    for (const item of items) {
      const rentals = await getRentalsForItem(item.id);
      let totalBooked = 0;
      for (const rental of rentals) {
        const rentalItem = (rental.items || []).find((i) => i.itemId === item.id);
        if (rentalItem) {
          totalBooked += rentalItem.quantity || 0;
        }
      }

      // item.quantity is the remaining stock (already decremented by rentals)
      const available = item.quantity;
      const totalQty = item.quantity + totalBooked;
      if (available <= 2) {
        alerts.push({
          itemId: item.id,
          itemName: item.name,
          totalQuantity: totalQty,
          bookedQuantity: totalBooked,
          availableQuantity: Math.max(0, available),
          critical: available <= 0,
        });
      }
    }

    return alerts.sort((a, b) => a.availableQuantity - b.availableQuantity);
  } catch (error) {
    console.error('Error getting low availability alerts:', error);
    throw error;
  }
};

/**
 * Get total equipment currently out (sum of all quantities in active rentals).
 * @returns {Promise<number>}
 */
export const getEquipmentCurrentlyOut = async () => {
  try {
    const customersSnapshot = await db.collection('customers').get();
    let totalOut = 0;

    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .where('status', '==', 'active')
        .get();

      for (const rentalDoc of rentalsSnapshot.docs) {
        const items = rentalDoc.data().items || [];
        for (const item of items) {
          totalOut += item.quantity || 0;
        }
      }
    }

    return totalOut;
  } catch (error) {
    console.error('Error getting equipment currently out:', error);
    throw error;
  }
};
