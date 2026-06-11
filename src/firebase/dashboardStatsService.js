import { db } from './firebaseConfig';

/**
 * OPTIMIZED Dashboard Statistics Service
 * 
 * Uses date-based overlap for ALL availability calculations.
 * Rental status is NOT used to determine availability — only dates matter.
 */

/**
 * Fetch all dashboard stats in a single efficient operation.
 * @returns {Promise<object>} Dashboard stats object
 */
export const getDashboardStats = async () => {
  console.time('Dashboard Stats');
  
  try {
    // Phase 1: Fetch all customers and items (2 parallel queries)
    const [customersSnapshot, itemsSnapshot] = await Promise.all([
      db.collection('customers').get(),
      db.collection('items').get(),
    ]);

    const customers = customersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Phase 2: Single loop through customers to collect all rentals
    console.time('Rental Aggregation');
    const allRentals = [];

    for (const customer of customers) {
      const rentalsSnapshot = await db.collection('customers').doc(customer.id).collection('rentals').get();

      const customerRentals = rentalsSnapshot.docs.map(doc => ({
        id: doc.id,
        customerId: customer.id,
        customerName: customer.name || 'Unknown',
        ...doc.data(),
        startDate: doc.data().startDate?.toDate?.() || new Date(doc.data().startDate),
        endDate: doc.data().endDate?.toDate?.() || new Date(doc.data().endDate),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));

      allRentals.push(...customerRentals);
    }
    console.timeEnd('Rental Aggregation');

    // Phase 3: Calculate all stats from fetched data (no additional queries)
    console.time('Stats Calculation');
    
    const stats = {
      totalCustomers: customers.length,
      totalInventoryItems: items.length,
      totalRentals: allRentals.length,
      totalRevenue: 0,
      totalOutstanding: 0,
      activeRentalsToday: [],
      upcomingRentals: [],
      equipmentOut: 0,
      lowAvailabilityAlerts: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate revenue, outstanding, and categorize rentals by date only
    for (const rental of allRentals) {
      // Revenue
      if (rental.totalAmount) {
        stats.totalRevenue += rental.totalAmount;
      }

      // Outstanding payments (always based on payment data, not status)
      if (rental.remainingBalance > 0) {
        stats.totalOutstanding += rental.remainingBalance;
      }

      // Active today: rent date range covers today regardless of status
      const rentalStart = new Date(rental.startDate);
      const rentalEnd = new Date(rental.endDate);
      rentalStart.setHours(0, 0, 0, 0);
      rentalEnd.setHours(23, 59, 59, 999);

      if (today >= rentalStart && today <= rentalEnd) {
        stats.activeRentalsToday.push(rental);
      } else if (rentalStart > today) {
        // Upcoming: start date is in the future
        stats.upcomingRentals.push(rental);
      }

      // Equipment out: sum quantities of rentals active today (date overlap)
      if (today >= rentalStart && today <= rentalEnd) {
        const rentalItems = rental.items || [];
        for (const item of rentalItems) {
          stats.equipmentOut += item.quantity || 0;
        }
      }
    }

    // Low availability alerts: check future bookings for each item
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const itemAlerts = {};
    for (const item of items) {
      const totalQty = item.quantity || 0;
      
      // Calculate booked quantity for tomorrow
      let tomorrowBooked = 0;
      for (const rental of allRentals) {
        const rentalStart = new Date(rental.startDate);
        const rentalEnd = new Date(rental.endDate);
        rentalStart.setHours(0, 0, 0, 0);
        rentalEnd.setHours(23, 59, 59, 999);

        if (tomorrow >= rentalStart && tomorrow <= rentalEnd) {
          const rentalItem = (rental.items || []).find(i => i.itemId === item.id);
          if (rentalItem) {
            tomorrowBooked += rentalItem.quantity || 0;
          }
        }
      }

      const availableTomorrow = Math.max(0, totalQty - tomorrowBooked);

      if (availableTomorrow <= 2) {
        itemAlerts[item.id] = {
          itemId: item.id,
          itemName: item.name,
          totalQuantity: totalQty,
          bookedQuantity: tomorrowBooked,
          availableQuantity: availableTomorrow,
          critical: availableTomorrow <= 0,
        };
      }
    }

    stats.lowAvailabilityAlerts = Object.values(itemAlerts).sort(
      (a, b) => a.availableQuantity - b.availableQuantity
    );

    console.timeEnd('Stats Calculation');
    console.timeEnd('Dashboard Stats');

    return stats;
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    throw error;
  }
};

/**
 * Get only the essential stats for the dashboard header (faster subset).
 * @returns {Promise<object>}
 */
export const getDashboardHeaderStats = async () => {
  console.time('Dashboard Header Stats');
  
  try {
    const [customersSnapshot, itemsSnapshot, rentalsCount] = await Promise.all([
      db.collection('customers').count().get(),
      db.collection('items').count().get(),
      db.collectionGroup('rentals').count().get(),
    ]);

    const stats = {
      totalCustomers: customersSnapshot.data().count,
      totalInventoryItems: itemsSnapshot.data().count,
      totalRentals: rentalsCount.data().count,
    };

    console.timeEnd('Dashboard Header Stats');
    return stats;
  } catch (error) {
    console.error('Error calculating dashboard header stats:', error);
    throw error;
  }
};
