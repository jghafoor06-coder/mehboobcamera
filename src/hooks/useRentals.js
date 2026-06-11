/**
 * Custom hook for rental list data fetching (per customer).
 * Encapsulates subscription logic previously in CustomerProfileScreen.
 */
import { useState, useEffect } from 'react';
import { subscribeToRentals } from '../firebase/rentalsService';
import { getCustomerById } from '../firebase/customersService';
import { getRentalLifecycleStatus } from '../services/availabilityService';

export default function useRentals(customerId) {
  const [customer, setCustomer] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadCustomer = async () => {
      try {
        const customerData = await getCustomerById(customerId);
        if (!cancelled) setCustomer(customerData);
      } catch (error) {
        console.error('Error loading customer:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadCustomer();

    const unsubscribeRentals = subscribeToRentals(customerId, (data) => {
      if (!cancelled) setRentals(data);
    });

    return () => {
      cancelled = true;
      unsubscribeRentals();
    };
  }, [customerId]);

  const activeRentalsCount = rentals.filter((r) => {
    const status = getRentalLifecycleStatus(r.startDate, r.endDate, r.status);
    return status === 'ongoing';
  }).length;

  const totalSpent = rentals.reduce((sum, r) => sum + r.totalAmount, 0);
  const outstandingBalance = rentals.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);

  return {
    customer,
    rentals,
    loading,
    activeRentalsCount,
    totalSpent,
    outstandingBalance,
  };
}
