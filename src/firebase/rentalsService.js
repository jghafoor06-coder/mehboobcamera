import firestore from '@react-native-firebase/firestore';
import { db } from './firebaseConfig';
import { decrementItemQuantity, incrementItemQuantity } from './itemsService';

const COLLECTION = 'customers';

/**
 * Create a rental under a customer's subcollection.
 * @param {string} customerId
 * @param {object} rentalData - { items, totalAmount, totalDays, startDate, endDate, rentalSlot }
 * @returns {string} The new document ID.
 */
export const createRental = async (customerId, rentalData) => {
  try {
    const docRef = await db
      .collection(COLLECTION)
      .doc(customerId)
      .collection('rentals')
      .add({
        customerId,
        items: rentalData.items,
        totalAmount: rentalData.totalAmount,
        totalDays: rentalData.totalDays,
        startDate: rentalData.startDate,
        endDate: rentalData.endDate,
        rentalSlot: rentalData.rentalSlot || 'full_day',
        status: 'active',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    // Decrement stock for each rented item
    for (const item of rentalData.items) {
      if (item.itemId && item.quantity) {
        await decrementItemQuantity(item.itemId, item.quantity);
      }
    }

    // Update customer rental count and last rental date
    await db.collection(COLLECTION).doc(customerId).update({
      rentalCount: firestore.FieldValue.increment(1),
      lastRentalDate: rentalData.startDate,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating rental:', error);
    throw error;
  }
};

/**
 * Fetch all rentals for a specific customer.
 * @param {string} customerId
 * @returns {Array} Array of rental objects with id field.
 */
export const getRentalsByCustomer = async (customerId) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .doc(customerId)
      .collection('rentals')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching rentals:', error);
    throw error;
  }
};

/**
 * Count all rentals across all customers.
 * @returns {number}
 */
export const getTotalRentalCount = async () => {
  try {
    const customersSnapshot = await db.collection(COLLECTION).get();
    let count = 0;
    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .count()
        .get();
      count += rentalsSnapshot.data().count;
    }
    return count;
  } catch (error) {
    console.error('Error counting rentals:', error);
    throw error;
  }
};

/**
 * Calculate total revenue across all customers' rentals.
 * @returns {number} Sum of all rental totalAmounts.
 */
export const getTotalRevenue = async () => {
  try {
    const customersSnapshot = await db.collection(COLLECTION).get();
    let total = 0;
    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .get();
      for (const rentalDoc of rentalsSnapshot.docs) {
        total += rentalDoc.data().totalAmount || 0;
      }
    }
    return total;
  } catch (error) {
    console.error('Error calculating total revenue:', error);
    throw error;
  }
};

/**
 * Fetch all active rentals across all customers.
 * @returns {Array} Array of rental objects with customerName attached.
 */
export const getActiveRentals = async () => {
  try {
    const customersSnapshot = await db.collection(COLLECTION).get();
    const activeRentals = [];

    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .where('status', '==', 'active')
        .get();

      for (const rentalDoc of rentalsSnapshot.docs) {
        const rentalData = rentalDoc.data();
        activeRentals.push({
          id: rentalDoc.id,
          customerId: customerDoc.id,
          customerName: customerData.name,
          ...rentalData,
          startDate: rentalData.startDate?.toDate?.() || new Date(rentalData.startDate),
          endDate: rentalData.endDate?.toDate?.() || new Date(rentalData.endDate),
          createdAt: rentalData.createdAt?.toDate?.() || new Date(),
        });
      }
    }

    return activeRentals;
  } catch (error) {
    console.error('Error fetching active rentals:', error);
    throw error;
  }
};

/**
 * Fetch all rentals across all customers (for dashboard, etc.)
 * @returns {Array} Array of rental objects with customerName.
 */
export const getAllRentals = async () => {
  try {
    const customersSnapshot = await db.collection(COLLECTION).get();
    const allRentals = [];

    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .orderBy('createdAt', 'desc')
        .get();

      for (const rentalDoc of rentalsSnapshot.docs) {
        allRentals.push({
          id: rentalDoc.id,
          customerId: customerDoc.id,
          customerName: customerData.name,
          ...rentalDoc.data(),
          createdAt: rentalDoc.data().createdAt?.toDate?.() || new Date(),
        });
      }
    }

    return allRentals;
  } catch (error) {
    console.error('Error fetching all rentals:', error);
    throw error;
  }
};

/**
 * Update a rental's status.
 * @param {string} customerId
 * @param {string} rentalId
 * @param {string} status - 'active' | 'returned' | 'overdue'
 */
export const updateRentalStatus = async (customerId, rentalId, status) => {
  try {
    // Fetch the rental to get its items before updating status
    const rentalRef = db
      .collection(COLLECTION)
      .doc(customerId)
      .collection('rentals')
      .doc(rentalId);
    const rentalDoc = await rentalRef.get();

    await rentalRef.update({
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // When a rental is returned, restore stock for each item
    if (status === 'returned' && rentalDoc.exists) {
      const rentalData = rentalDoc.data();
      for (const item of rentalData.items || []) {
        if (item.itemId && item.quantity) {
          await incrementItemQuantity(item.itemId, item.quantity);
        }
      }
    }
  } catch (error) {
    console.error('Error updating rental status:', error);
    throw error;
  }
};

/**
 * Delete a rental document.
 * @param {string} customerId
 * @param {string} rentalId
 */
export const deleteRental = async (customerId, rentalId) => {
  try {
    const rentalRef = db
      .collection(COLLECTION)
      .doc(customerId)
      .collection('rentals')
      .doc(rentalId);
    const rentalDoc = await rentalRef.get();

    // Restore stock for each item before deleting
    if (rentalDoc.exists) {
      const rentalData = rentalDoc.data();
      for (const item of rentalData.items || []) {
        if (item.itemId && item.quantity) {
          await incrementItemQuantity(item.itemId, item.quantity);
        }
      }
    }

    // Decrement the customer's rental count when deleting
    await db.collection(COLLECTION).doc(customerId).update({
      rentalCount: firestore.FieldValue.increment(-1),
    });

    await rentalRef.delete();
  } catch (error) {
    console.error('Error deleting rental:', error);
    throw error;
  }
};

/**
 * Fetch active rentals where today falls within startDate and endDate.
 * @returns {Array} Array of rental objects with customerName attached.
 */
export const getActiveRentalsToday = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const customersSnapshot = await db.collection(COLLECTION).get();
    const todayRentals = [];

    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .where('status', '==', 'active')
        .get();

      for (const rentalDoc of rentalsSnapshot.docs) {
        const rentalData = rentalDoc.data();
        const start = rentalData.startDate?.toDate?.() || new Date(rentalData.startDate);
        const end = rentalData.endDate?.toDate?.() || new Date(rentalData.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (today >= start && today <= end) {
          todayRentals.push({
            id: rentalDoc.id,
            customerId: customerDoc.id,
            customerName: customerData.name,
            ...rentalData,
            startDate: start,
            endDate: end,
            createdAt: rentalData.createdAt?.toDate?.() || new Date(),
          });
        }
      }
    }
    return todayRentals;
  } catch (error) {
    console.error('Error fetching active rentals today:', error);
    throw error;
  }
};

/**
 * Fetch rentals where startDate is after today (upcoming).
 * @returns {Array} Array of rental objects with customerName attached.
 */
export const getUpcomingRentals = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const customersSnapshot = await db.collection(COLLECTION).get();
    const upcoming = [];

    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .where('status', '==', 'active')
        .get();

      for (const rentalDoc of rentalsSnapshot.docs) {
        const rentalData = rentalDoc.data();
        const start = rentalData.startDate?.toDate?.() || new Date(rentalData.startDate);
        start.setHours(0, 0, 0, 0);
        if (start > today) {
          upcoming.push({
            id: rentalDoc.id,
            customerId: customerDoc.id,
            customerName: customerData.name,
            ...rentalData,
            startDate: start,
            endDate: rentalData.endDate?.toDate?.() || new Date(rentalData.endDate),
            createdAt: rentalData.createdAt?.toDate?.() || new Date(),
          });
        }
      }
    }
    return upcoming;
  } catch (error) {
    console.error('Error fetching upcoming rentals:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time rental updates for a specific customer.
 * @param {string} customerId
 * @param {function} callback
 * @returns {function} Unsubscribe function.
 */
export const subscribeToRentals = (customerId, callback) => {
  return db
    .collection(COLLECTION)
    .doc(customerId)
    .collection('rentals')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const rentals = snapshot.docs.map((doc) => ({
          id: doc.id,
          customerId,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));
        callback(rentals);
      },
      (error) => {
        console.error('Error in rentals subscription:', error);
      },
    );
};
