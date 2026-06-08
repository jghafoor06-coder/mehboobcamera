import firestore from '@react-native-firebase/firestore';

/**
 * Firebase Firestore instance.
 * All Firestore operations should go through the service files,
 * which import this instance.
 */
export const db = firestore();

export default db;
