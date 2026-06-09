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
 * Update a rental's status with payment information.
 * @param {string} customerId
 * @param {string} rentalId
 * @param {string} status - 'active' | 'returned' | 'overdue'
 * @param {object} paymentData - { amountPaid: number, remainingBalance: number, paymentStatus: string }
 */
export const updateRentalStatus = async (customerId, rentalId, status, paymentData = null) => {
  try {
    const rentalRef = db
      .collection(COLLECTION)
      .doc(customerId)
      .collection('rentals')
      .doc(rentalId);
    const rentalDoc = await rentalRef.get();

    if (!rentalDoc.exists) {
      console.error('Rental document not found:', customerId, rentalId);
      throw new Error('Rental not found. It may have been deleted.');
    }

    const rentalData = rentalDoc.data();

    const updateData = {
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Add payment fields when returning
    if (status === 'returned' && paymentData) {
      updateData.amountPaid = paymentData.amountPaid;
      updateData.remainingBalance = paymentData.remainingBalance;
      updateData.paymentStatus = paymentData.paymentStatus;
      updateData.returnedAt = firestore.FieldValue.serverTimestamp();
    }

    await rentalRef.update(updateData);

    // When a rental is returned, restore stock for each item
    if (status === 'returned') {
      for (const item of rentalData.items || []) {
        if (item.itemId && item.quantity) {
          try {
            await incrementItemQuantity(item.itemId, item.quantity);
          } catch (stockError) {
            console.warn('Failed to restore stock for item ' + item.itemId + ':', stockError.message);
            // Non-blocking: stock restore failure shouldn't block the return
          }
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
 * Collect a payment against a returned rental's remaining balance.
 * Updates the rental document and stores a payment history entry.
 *
 * @param {string} customerId
 * @param {string} rentalId
 * @param {number} paymentAmount - The amount being collected
 * @returns {Promise<object>} Updated rental payment data
 */
export const collectPayment = async (customerId, rentalId, paymentAmount) => {
  try {
    const rentalRef = db
      .collection(COLLECTION)
      .doc(customerId)
      .collection('rentals')
      .doc(rentalId);

    const rentalDoc = await rentalRef.get();
    if (!rentalDoc.exists) {
      throw new Error('Rental not found');
    }

    const currentData = rentalDoc.data();
    if (currentData.status !== 'returned') {
      throw new Error('Can only collect payment on returned rentals');
    }

    const currentPaid = currentData.amountPaid || 0;
    const currentRemaining = currentData.remainingBalance || 0;
    const totalAmount = currentData.totalAmount || 0;

    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (paymentAmount > currentRemaining) {
      throw new Error('Payment amount cannot exceed remaining balance');
    }

    const newAmountPaid = currentPaid + paymentAmount;
    const newRemainingBalance = currentRemaining - paymentAmount;
    const newPaymentStatus = newRemainingBalance === 0 ? 'paid' : 'partial';

    // Store payment history entry
    const paymentsRef = rentalRef.collection('payments');
    await paymentsRef.add({
      amount: paymentAmount,
      date: firestore.FieldValue.serverTimestamp(),
      type: 'collection',
    });

    // Update rental document
    await rentalRef.update({
      amountPaid: newAmountPaid,
      remainingBalance: newRemainingBalance,
      paymentStatus: newPaymentStatus,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      amountPaid: newAmountPaid,
      remainingBalance: newRemainingBalance,
      paymentStatus: newPaymentStatus,
    };
  } catch (error) {
    console.error('Error collecting payment:', error);
    throw error;
  }
};

/**
 * Get the total outstanding balance across all returned rentals with remaining balance > 0.
 * @returns {Promise<number>}
 */
export const getTotalOutstanding = async () => {
  try {
    const customersSnapshot = await db.collection(COLLECTION).get();
    let total = 0;
    for (const customerDoc of customersSnapshot.docs) {
      const rentalsSnapshot = await customerDoc.ref
        .collection('rentals')
        .where('status', '==', 'returned')
        .get();
      for (const rentalDoc of rentalsSnapshot.docs) {
        const data = rentalDoc.data();
        if (data.remainingBalance) {
          total += data.remainingBalance;
        }
      }
    }
    return total;
  } catch (error) {
    console.error('Error calculating total outstanding:', error);
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
