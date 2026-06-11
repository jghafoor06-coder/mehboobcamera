/**
 * Custom hook for inventory data fetching.
 * Encapsulates subscription, availability, and search logic previously in InventoryScreen.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { subscribeToItems, deleteItem } from '../firebase/itemsService';
import { getEquipmentAvailability } from '../utils/availabilityService';
import useDebounce from '../utils/useDebounce';

export default function useInventory() {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [loading, setLoading] = useState(true);
  const availabilityFetched = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToItems((data) => {
      setInventoryItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch availability once when items first load, in batches
  useEffect(() => {
    if (inventoryItems.length === 0 || availabilityFetched.current) return;
    let cancelled = false;
    const fetchAvailability = async () => {
      const map = {};
      const batchSize = 5;
      for (let i = 0; i < inventoryItems.length; i += batchSize) {
        if (cancelled) return;
        const batch = inventoryItems.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (item) => {
            try {
              const avail = await getEquipmentAvailability(item.id);
              if (avail && !cancelled) {
                map[item.id] = avail;
              }
            } catch (e) {
              // silent fail per item
            }
          }),
        );
      }
      if (!cancelled) {
        setAvailabilityMap(map);
        availabilityFetched.current = true;
      }
    };
    fetchAvailability();
    return () => { cancelled = true; };
  }, [inventoryItems]);

  const filtered = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearchText.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, debouncedSearchText, selectedCategory]);

  const handleDeleteItem = useCallback(async (itemId) => {
    await deleteItem(itemId);
  }, []);

  return {
    inventoryItems,
    filtered,
    availabilityMap,
    loading,
    searchText,
    setSearchText,
    selectedCategory,
    setSelectedCategory,
    handleDeleteItem,
  };
}
