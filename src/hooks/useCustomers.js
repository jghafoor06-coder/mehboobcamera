/**
 * Custom hook for customer list data fetching.
 * Encapsulates subscription and search logic previously in CustomerScreen.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribeToCustomers } from '../firebase/customersService';
import useDebounce from '../utils/useDebounce';

export default function useCustomers() {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToCustomers((data) => {
      setCustomers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        c.phone.includes(debouncedSearchText),
    );
  }, [customers, debouncedSearchText]);

  return {
    customers,
    filtered,
    loading,
    error,
    searchText,
    setSearchText,
  };
}
