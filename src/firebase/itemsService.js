import firestore from '@react-native-firebase/firestore';
import { db } from './firebaseConfig';

const COLLECTION = 'items';

/**
 * Create a new inventory item in Firestore.
 * @param {object} itemData - { name, category, pricePerDay, description? }
 * @returns {string} The new document ID.
 */
export const createItem = async (itemData) => {
  try {
    const docRef = await db.collection(COLLECTION).add({
      name: itemData.name.trim(),
      category: itemData.category,
      pricePerDay: Number(itemData.pricePerDay),
      quantity: Number(itemData.quantity) || 1,
      description: itemData.description || '',
      available: true,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

/**
 * Fetch all inventory items.
 * @returns {Array} Array of item objects with id field.
 */
export const getItems = async () => {
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
    console.error('Error fetching items:', error);
    throw error;
  }
};

/**
 * Fetch a single inventory item by ID.
 * @param {string} itemId
 * @returns {object|null} Item object or null if not found.
 */
export const getItemById = async (itemId) => {
  try {
    const doc = await db.collection(COLLECTION).doc(itemId).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching item:', error);
    throw error;
  }
};

/**
 * Update item availability status.
 * @param {string} itemId
 * @param {boolean} available
 */
export const updateItemAvailability = async (itemId, available) => {
  try {
    await db.collection(COLLECTION).doc(itemId).update({ available });
  } catch (error) {
    console.error('Error updating item availability:', error);
    throw error;
  }
};

/**
 * Update an inventory item.
 * @param {string} itemId
 * @param {object} itemData - { name, category, pricePerDay }
 */
export const updateItem = async (itemId, itemData) => {
  try {
    await db.collection(COLLECTION).doc(itemId).update({
      name: itemData.name.trim(),
      category: itemData.category,
      pricePerDay: Number(itemData.pricePerDay),
      quantity: Number(itemData.quantity) || 1,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

/**
 * Decrement item quantity by a given amount.
 * @param {string} itemId
 * @param {number} amount - Number of units to subtract
 */
export const decrementItemQuantity = async (itemId, amount) => {
  try {
    const doc = await db.collection(COLLECTION).doc(itemId).get();
    if (!doc.exists) {
      console.warn('Item document not found for decrement:', itemId);
      return; // Silently skip if item was deleted
    }
    await doc.ref.update({
      quantity: firestore.FieldValue.increment(-Math.abs(amount)),
    });
  } catch (error) {
    console.error('Error decrementing item quantity:', error);
    throw error;
  }
};

/**
 * Increment item quantity by a given amount.
 * @param {string} itemId
 * @param {number} amount - Number of units to add
 */
export const incrementItemQuantity = async (itemId, amount) => {
  try {
    const doc = await db.collection(COLLECTION).doc(itemId).get();
    if (!doc.exists) {
      console.warn('Item document not found for increment:', itemId);
      return; // Silently skip if item was deleted
    }
    await doc.ref.update({
      quantity: firestore.FieldValue.increment(Math.abs(amount)),
    });
  } catch (error) {
    console.error('Error incrementing item quantity:', error);
    throw error;
  }
};

/**
 * Delete an inventory item.
 * @param {string} itemId
 */
export const deleteItem = async (itemId) => {
  try {
    await db.collection(COLLECTION).doc(itemId).delete();
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time inventory updates.
 * @param {function} callback - Called with array of items on each update.
 * @returns {function} Unsubscribe function.
 */
export const subscribeToItems = (callback) => {
  return db
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));
        callback(items);
      },
      (error) => {
        console.error('Error in items subscription:', error);
      },
    );
};
