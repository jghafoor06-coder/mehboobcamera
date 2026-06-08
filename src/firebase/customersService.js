import firestore from '@react-native-firebase/firestore';
import { db } from './firebaseConfig';

const COLLECTION = 'customers';

/**
 * Create a new customer document in Firestore.
 * @param {object} customerData - { name, phone, cnic }
 * @returns {string} The new document ID.
 */
export const createCustomer = async (customerData) => {
  try {
    const docRef = await db.collection(COLLECTION).add({
      name: customerData.name.trim(),
      phone: customerData.phone.trim(),
      cnic: customerData.cnic?.trim() || '',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Fetch all customers ordered by creation date (newest first).
 * @returns {Array} Array of customer objects with id field.
 */
export const getCustomers = async () => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

/**
 * Fetch a single customer by ID.
 * @param {string} customerId
 * @returns {object|null} Customer object or null if not found.
 */
export const getCustomerById = async (customerId) => {
  try {
    const doc = await db.collection(COLLECTION).doc(customerId).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw error;
  }
};

/**
 * Count all customers.
 * @returns {number}
 */
export const getCustomerCount = async () => {
  try {
    const snapshot = await db.collection(COLLECTION).count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error('Error counting customers:', error);
    throw error;
  }
};

/**
 * Update a customer document.
 * @param {string} customerId
 * @param {object} customerData - { name, phone, cnic }
 */
export const updateCustomer = async (customerId, customerData) => {
  try {
    await db.collection(COLLECTION).doc(customerId).update({
      name: customerData.name.trim(),
      phone: customerData.phone.trim(),
      cnic: customerData.cnic?.trim() || '',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

/**
 * Delete a customer document and all its rental subcollections.
 * @param {string} customerId
 */
export const deleteCustomer = async (customerId) => {
  try {
    // Delete all rental subdocuments first
    const rentalsSnapshot = await db
      .collection(COLLECTION)
      .doc(customerId)
      .collection('rentals')
      .get();
    const batch = db.batch();
    rentalsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection(COLLECTION).doc(customerId));
    await batch.commit();
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time customer list updates.
 * @param {function} callback - Called with array of customers on each update.
 * @returns {function} Unsubscribe function.
 */
export const subscribeToCustomers = (callback) => {
  return db
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const customers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));
        callback(customers);
      },
      (error) => {
        console.error('Error in customer subscription:', error);
      },
    );
};
