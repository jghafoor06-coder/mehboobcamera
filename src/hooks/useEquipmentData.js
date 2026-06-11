/**
 * Custom hook for equipment detail data fetching and computations.
 * Encapsulates fetching, timeline generation, and utilization logic
 * previously in EquipmentDetailsScreen.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  getEquipmentAvailability,
  getRentalsForItem,
  getBookedQuantityForDate,
  RENTAL_SLOTS,
} from '../services/availabilityService';

/**
 * Get upcoming/active rentals from raw rentals for a specific item.
 */
function getUpcomingRentalsForItem(allRentals, itemId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = [];

  for (const rental of allRentals) {
    const items = rental.items || [];
    const hasItem = items.some((i) => i.itemId === itemId);
    if (!hasItem) continue;

    const endDate = new Date(rental.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (endDate >= today) {
      const rentalItem = items.find((i) => i.itemId === itemId);
      const start = new Date(rental.startDate);
      start.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let rentalStatus = 'upcoming';
      if (start <= now && endDate >= now) rentalStatus = 'active';
      else if (endDate < now) rentalStatus = 'completed';

      upcoming.push({
        id: rental.id,
        customerId: rental.customerId,
        customerName: rental.customerName,
        ...rental,
        quantity: rentalItem?.quantity || 0,
        rentalStatus,
        startDate: start,
        endDate,
      });
    }
  }

  upcoming.sort((a, b) => a.startDate - b.startDate);
  return upcoming;
}

/**
 * Calculate utilization stats from raw rentals.
 */
function calculateUtilization(allRentals, itemId, totalQuantity) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentBooked = 0;
  let weeklyBooked = 0;
  let monthlyBooked = 0;
  const slotCounts = { day: 0, evening: 0, full_day: 0 };

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  for (const rental of allRentals) {
    const items = rental.items || [];
    const hasItem = items.some((i) => i.itemId === itemId);
    if (!hasItem) continue;

    const rentalItem = items.find((i) => i.itemId === itemId);
    const qty = rentalItem?.quantity || 0;
    const start = new Date(rental.startDate);
    const end = new Date(rental.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start <= today && end >= today) currentBooked += qty;
    if (start <= today && end >= weekAgo) weeklyBooked += qty;
    if (start <= today && end >= monthAgo) monthlyBooked += qty;

    const slot = rental.rentalSlot || 'full_day';
    slotCounts[slot] = (slotCounts[slot] || 0) + qty;
  }

  const currentUtilization =
    totalQuantity > 0 ? Math.round((currentBooked / totalQuantity) * 100) : 0;
  const weeklyUtilization =
    totalQuantity > 0
      ? Math.min(100, Math.round((weeklyBooked / (totalQuantity * 7)) * 100))
      : 0;
  const monthlyUtilization =
    totalQuantity > 0
      ? Math.min(100, Math.round((monthlyBooked / (totalQuantity * 30)) * 100))
      : 0;

  let mostRequestedSlot = 'full_day';
  let maxSlotCount = 0;
  for (const [slot, count] of Object.entries(slotCounts)) {
    if (count > maxSlotCount) {
      maxSlotCount = count;
      mostRequestedSlot = slot;
    }
  }

  const upcomingCount = allRentals.filter((r) => {
    const hasItem = (r.items || []).some((i) => i.itemId === itemId);
    if (!hasItem) return false;
    const start = new Date(r.startDate);
    start.setHours(0, 0, 0, 0);
    return start >= today;
  }).length;

  return {
    currentUtilization,
    weeklyUtilization,
    monthlyUtilization,
    upcomingCount,
    mostRequestedSlot: RENTAL_SLOTS[mostRequestedSlot]?.label || 'Full Day',
  };
}

/**
 * Generate 30-day timeline from raw rentals.
 */
function generateTimeline(allRentals, itemId, totalQuantity) {
  const itemRentals = allRentals.filter((r) => {
    return (r.items || []).some((i) => i.itemId === itemId);
  });

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dayBooked = getBookedQuantityForDate(date, itemRentals, itemId);
    const available = Math.max(0, totalQuantity - dayBooked.total);

    let status = 'green';
    if (available === 0 || dayBooked.total >= totalQuantity) {
      status = 'red';
    } else if (available <= Math.ceil(totalQuantity * 0.5)) {
      status = 'orange';
    }

    days.push({
      date,
      dayNumber: date.getDate(),
      month: months[date.getMonth()],
      booked: dayBooked.total,
      available,
      total: totalQuantity,
      status,
      slotBreakdown: dayBooked.breakdown,
    });
  }

  return days;
}

export default function useEquipmentData(itemId) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [item, setItem] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [upcomingRentals, setUpcomingRentals] = useState([]);

  const rentalsRef = useRef([]);
  const totalQuantityRef = useRef(1);
  const [rentalsVersion, setRentalsVersion] = useState(0);

  const fetchData = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    try {
      const rentalsData = await getRentalsForItem(itemId);
      const availData = await getEquipmentAvailability(itemId, rentalsData);

      if (availData) {
        setItem(availData.item);
        setAvailability(availData);
      }

      setUpcomingRentals(getUpcomingRentalsForItem(rentalsData, itemId));

      rentalsRef.current = rentalsData;
      totalQuantityRef.current = availData?.total || 1;
      setRentalsVersion((v) => v + 1);
    } catch (error) {
      console.error('Error fetching equipment details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const timeline = useMemo(() => {
    if (rentalsVersion === 0) return [];
    return generateTimeline(rentalsRef.current, itemId, totalQuantityRef.current);
  }, [rentalsVersion, itemId]);

  const utilization = useMemo(() => {
    if (rentalsVersion === 0) return null;
    return calculateUtilization(rentalsRef.current, itemId, totalQuantityRef.current);
  }, [rentalsVersion, itemId]);

  return {
    loading,
    refreshing,
    item,
    availability,
    upcomingRentals,
    rentalsRef,
    totalQuantityRef,
    rentalsVersion,
    timeline,
    utilization,
    onRefresh,
  };
}
