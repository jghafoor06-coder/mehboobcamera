/**
 * Custom hook for dashboard data fetching.
 * Encapsulates all subscription and stat-fetching logic previously in DashboardScreen.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToCustomers } from '../firebase/customersService';
import { subscribeToItems } from '../firebase/itemsService';
import { getDashboardStats } from '../firebase/dashboardStatsService';

export default function useDashboardData() {
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalInventoryItems: 0,
    totalRentals: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    activeRentalsToday: [],
    upcomingRentals: [],
    equipmentOut: 0,
    lowAvailabilityAlerts: [],
  });

  const [loadingPhase, setLoadingPhase] = useState('header');
  const [error, setError] = useState(null);
  const dataLoaded = useRef({ customers: false, items: false, stats: false });

  const checkAllLoaded = useCallback(() => {
    if (dataLoaded.current.customers && dataLoaded.current.items && dataLoaded.current.stats) {
      setLoadingPhase('done');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);
      dataLoaded.current.stats = true;
      checkAllLoaded();
    } catch (err) {
      console.error('Dashboard stats fetch error:', err);
      setError('Failed to load dashboard data. Pull to refresh.');
      dataLoaded.current.stats = true;
      checkAllLoaded();
    }
  }, [checkAllLoaded]);

  useEffect(() => {
    setLoadingPhase('header');

    const unsubscribeCustomers = subscribeToCustomers((data) => {
      setCustomers(data);
      dataLoaded.current.customers = true;
      checkAllLoaded();
    });

    const unsubscribeItems = subscribeToItems((data) => {
      setInventoryItems(data);
      dataLoaded.current.items = true;
      checkAllLoaded();
    });

    setLoadingPhase('stats');
    fetchStats();

    return () => {
      unsubscribeCustomers();
      unsubscribeItems();
    };
  }, [fetchStats, checkAllLoaded]);

  const refreshStats = useCallback(() => {
    setLoadingPhase('stats');
    dataLoaded.current.stats = false;
    fetchStats();
  }, [fetchStats]);

  return {
    customers,
    inventoryItems,
    stats,
    loadingPhase,
    error,
    refreshStats,
  };
}
